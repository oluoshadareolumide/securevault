// ============================================================
// routes/webhooks.js — Webhook endpoint management
// ============================================================
const router  = require('express').Router();
const crypto  = require('crypto');
const { query } = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/webhooks ─────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const result = await query(
    'SELECT id, url, events, is_active, created_at FROM webhooks WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ webhooks: result.rows });
});

// ── POST /api/webhooks ────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { url, events = [] } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const secret = crypto.randomBytes(24).toString('hex');
  const result = await query(
    'INSERT INTO webhooks (user_id, url, secret, events) VALUES ($1,$2,$3,$4) RETURNING id, url, events, created_at',
    [req.user.id, url, secret, events]
  );
  res.status(201).json({ ...result.rows[0], secret }); // secret shown once
});

// ── DELETE /api/webhooks/:id ──────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const result = await query(
    'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ success: true });
});

module.exports = router;
