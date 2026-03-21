// ============================================================
// routes/apikeys.js — Manage API keys
// ============================================================
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const { query } = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

// Generate a key: sv_live_XXXXXXXXXXXXXXXXXXXXXXXX
function generateApiKey() {
  const secret = crypto.randomBytes(32).toString('hex');
  return `sv_live_${secret}`;
}

// ── GET /api/apikeys ──────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const result = await query(
    'SELECT id, name, key_prefix, last_used, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ keys: result.rows });
});

// ── POST /api/apikeys ─────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Key name required' });

  const key    = generateApiKey();
  const prefix = key.substring(0, 20);
  const hash   = await bcrypt.hash(key, 10);

  const result = await query(
    'INSERT INTO api_keys (user_id, name, key_hash, key_prefix) VALUES ($1,$2,$3,$4) RETURNING id, name, key_prefix, created_at',
    [req.user.id, name, hash, prefix]
  );

  // Return the full key ONCE — it won't be shown again
  res.status(201).json({ ...result.rows[0], full_key: key });
});

// ── DELETE /api/apikeys/:id ───────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const result = await query(
    'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Key not found' });
  res.json({ success: true });
});

module.exports = router;
