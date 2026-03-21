// ============================================================
// middleware/auth.js — JWT + API Key authentication
// ============================================================
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../utils/db');

// ── JWT Auth ──────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, email, name, role, plan FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── API Key Auth ──────────────────────────────────────────────
const requireApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API key required' });

    // Keys are prefixed: sv_live_XXXXXXXX
    const prefix = apiKey.substring(0, 20);
    const result = await query(
      'SELECT ak.*, u.id as uid, u.email, u.name, u.plan FROM api_keys ak JOIN users u ON ak.user_id = u.id WHERE ak.key_prefix = $1',
      [prefix]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const row = result.rows[0];
    const valid = await bcrypt.compare(apiKey, row.key_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid API key' });

    await query('UPDATE api_keys SET last_used = NOW() WHERE id = $1', [row.id]);
    req.user = { id: row.uid, email: row.email, name: row.name, plan: row.plan };
    req.apiKeyId = row.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'API key authentication failed' });
  }
};

// ── JWT or API Key (either is fine) ───────────────────────────
const requireAnyAuth = async (req, res, next) => {
  if (req.headers['x-api-key']) return requireApiKey(req, res, next);
  return requireAuth(req, res, next);
};

module.exports = { requireAuth, requireApiKey, requireAnyAuth };
