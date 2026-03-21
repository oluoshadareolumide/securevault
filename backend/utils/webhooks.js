// ============================================================
// utils/webhooks.js — Fire outbound webhook events
// ============================================================
const crypto = require('crypto');
const { query } = require('./db');

/**
 * Fire webhooks for a given user and event type
 */
async function fireWebhooks(userId, eventType, payload) {
  if (!userId) return;

  const result = await query(
    `SELECT url, secret FROM webhooks
     WHERE user_id = $1 AND is_active = true
     AND (events = '{}' OR $2 = ANY(events))`,
    [userId, eventType]
  );

  if (result.rows.length === 0) return;

  const body = JSON.stringify({
    event:     eventType,
    timestamp: new Date().toISOString(),
    ...payload
  });

  for (const wh of result.rows) {
    const signature = crypto
      .createHmac('sha256', wh.secret)
      .update(body)
      .digest('hex');

    fetch(wh.url, {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'X-SecureVault-Event': eventType,
        'X-SecureVault-Sig':   `sha256=${signature}`
      },
      body,
      signal: AbortSignal.timeout(5000)
    }).catch(err => {
      console.warn(`[Webhook] Failed to deliver to ${wh.url}:`, err.message);
    });
  }
}

module.exports = { fireWebhooks };
