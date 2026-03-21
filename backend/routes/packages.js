// ============================================================
// routes/packages.js — Package CRUD + download
// ============================================================
const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt   = require('bcryptjs');
const { query, getClient } = require('../utils/db');
const { requireAnyAuth } = require('../middleware/auth');
const { sendPackageEmail } = require('../utils/mailer');
const { fireWebhooks } = require('../utils/webhooks');

// ── Multer config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 * 1024 }, // 100 GB
  fileFilter: (req, file, cb) => {
    // Block dangerous executables
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  }
});

// ── POST /api/packages — Create a new package ─────────────────
router.post('/', requireAnyAuth, upload.array('files', 50), async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      recipients,
      subject,
      message,
      encryption_mode = 'aes256',
      passcode,
      download_limit,
      disable_download = false,
      watermark = true,
      expiry_days = 7
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    const recipientList = typeof recipients === 'string'
      ? recipients.split(',').map(e => e.trim()).filter(Boolean)
      : (recipients || []);

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    // Hash passcode if provided
    let passcodeHash = null;
    if (passcode) {
      passcodeHash = await bcrypt.hash(passcode, 10);
    }

    // Calculate expiry
    const expiresAt = expiry_days !== 'never'
      ? new Date(Date.now() + parseInt(expiry_days) * 86400000)
      : null;

    // Create package
    const pkgResult = await client.query(
      `INSERT INTO packages
       (sender_id, subject, message, encryption_mode, passcode_hash,
        download_limit, disable_download, watermark, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, subject, message, encryption_mode, passcodeHash,
       download_limit || null, disable_download, watermark, expiresAt]
    );
    const pkg = pkgResult.rows[0];

    // Insert files
    for (const file of req.files) {
      await client.query(
        `INSERT INTO files (package_id, original_name, stored_name, mime_type, size_bytes, storage_path)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pkg.id, file.originalname, file.filename, file.mimetype,
         file.size, file.path]
      );
    }

    // Insert recipients
    for (const email of recipientList) {
      await client.query(
        'INSERT INTO recipients (package_id, email) VALUES ($1,$2)',
        [pkg.id, email.toLowerCase()]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, package_id, event_type, actor_email, ip_address)
       VALUES ($1,$2,'package.created',$3,$4)`,
      [req.user.id, pkg.id, req.user.email, req.ip]
    );

    await client.query('COMMIT');

    // Send notification emails (non-blocking)
    sendPackageEmail({
      senderName: req.user.name || req.user.email,
      recipients: recipientList,
      packageId: pkg.id,
      subject: subject || 'Secure files have been shared with you',
      message,
      expiresAt,
      hasPasscode: !!passcode
    }).catch(console.error);

    // Fire webhooks (non-blocking)
    fireWebhooks(req.user.id, 'package.sent', {
      package_id: pkg.id,
      files: req.files.length,
      recipients: recipientList.length
    }).catch(console.error);

    res.status(201).json({
      success: true,
      package: {
        ...pkg,
        file_count: req.files.length,
        recipient_count: recipientList.length,
        secure_link: `${process.env.FRONTEND_URL}/receive/${pkg.id}`
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create package error:', err);
    res.status(500).json({ error: err.message || 'Failed to create package' });
  } finally {
    client.release();
  }
});

// ── GET /api/packages — List sender's packages ─────────────────
router.get('/', requireAnyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.*,
         COUNT(DISTINCT f.id) as file_count,
         ARRAY_AGG(DISTINCT r.email) as recipients
       FROM packages p
       LEFT JOIN files f ON f.package_id = p.id
       LEFT JOIN recipients r ON r.package_id = p.id
       WHERE p.sender_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM packages WHERE sender_id = $1',
      [req.user.id]
    );

    res.json({
      packages: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ── GET /api/packages/:id — Get package (public, for recipients)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT p.id, p.subject, p.message, p.encryption_mode,
              p.disable_download, p.watermark, p.expires_at,
              p.download_count, p.view_count, p.is_active,
              p.passcode_hash IS NOT NULL as requires_passcode,
              u.name as sender_name, u.email as sender_email
       FROM packages p
       LEFT JOIN users u ON u.id = p.sender_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = result.rows[0];

    if (!pkg.is_active) {
      return res.status(410).json({ error: 'This package has been deactivated' });
    }
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This package has expired' });
    }

    // Increment view count
    await query('UPDATE packages SET view_count = view_count + 1 WHERE id = $1', [id]);

    // Get files (without storage path for security)
    const files = await query(
      'SELECT id, original_name, mime_type, size_bytes FROM files WHERE package_id = $1',
      [id]
    );

    res.json({ ...pkg, files: files.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// ── POST /api/packages/:id/verify — Verify passcode ───────────
router.post('/:id/verify', async (req, res) => {
  try {
    const { passcode } = req.body;
    const result = await query(
      'SELECT passcode_hash FROM packages WHERE id = $1 AND is_active = true',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Package not found' });
    const valid = await bcrypt.compare(passcode, result.rows[0].passcode_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect passcode' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── DELETE /api/packages/:id — Revoke package ─────────────────
router.delete('/:id', requireAnyAuth, async (req, res) => {
  try {
    const result = await query(
      'UPDATE packages SET is_active = false WHERE id = $1 AND sender_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found or not authorized' });
    }
    await query(
      `INSERT INTO activity_log (user_id, package_id, event_type) VALUES ($1,$2,'package.revoked')`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke package' });
  }
});

// ── GET /api/packages/:id/activity — Audit trail ──────────────
router.get('/:id/activity', requireAnyAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT al.* FROM activity_log al
       JOIN packages p ON p.id = al.package_id
       WHERE al.package_id = $1 AND p.sender_id = $2
       ORDER BY al.created_at DESC LIMIT 100`,
      [req.params.id, req.user.id]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;
