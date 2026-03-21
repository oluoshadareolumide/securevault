// ============================================================
// routes/files.js — Secure file download
// ============================================================
const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { query } = require('../utils/db');
const { fireWebhooks } = require('../utils/webhooks');

// ── GET /api/files/:fileId/download ───────────────────────────
router.get('/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file + package info
    const result = await query(
      `SELECT f.*, p.is_active, p.expires_at, p.disable_download,
              p.download_limit, p.download_count, p.sender_id,
              p.passcode_hash IS NOT NULL as requires_passcode
       FROM files f
       JOIN packages p ON p.id = f.package_id
       WHERE f.id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (!file.is_active) {
      return res.status(410).json({ error: 'This package is no longer active' });
    }
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This package has expired' });
    }
    if (file.disable_download) {
      return res.status(403).json({ error: 'Downloads are disabled for this package' });
    }
    if (file.download_limit && file.download_count >= file.download_limit) {
      return res.status(403).json({ error: 'Download limit reached' });
    }

    // Check file exists on disk
    if (!fs.existsSync(file.storage_path)) {
      return res.status(404).json({ error: 'File not found on storage' });
    }

    // Increment download count
    await query(
      'UPDATE packages SET download_count = download_count + 1 WHERE id = $1',
      [file.package_id]
    );

    // Log activity
    await query(
      `INSERT INTO activity_log (package_id, event_type, actor_email, ip_address, user_agent, metadata)
       VALUES ($1, 'file.downloaded', $2, $3, $4, $5)`,
      [file.package_id, req.query.email || null, req.ip, req.get('user-agent'),
       JSON.stringify({ file_id: fileId, file_name: file.original_name })]
    );

    // Fire webhook (non-blocking)
    fireWebhooks(file.sender_id, 'package.downloaded', {
      package_id: file.package_id,
      file_id: fileId,
      file_name: file.original_name,
      downloaded_by: req.query.email || 'unknown'
    }).catch(console.error);

    // Stream the file
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', file.size_bytes);

    const fileStream = fs.createReadStream(file.storage_path);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });

  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

module.exports = router;
