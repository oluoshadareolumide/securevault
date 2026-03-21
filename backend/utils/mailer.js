// ============================================================
// utils/mailer.js — Email notifications via Nodemailer
// ============================================================
const nodemailer = require('nodemailer');

// Configure your SMTP provider (SendGrid, Mailgun, AWS SES, etc.)
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.sendgrid.net',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

/**
 * Send notification emails to all recipients of a package
 */
async function sendPackageEmail({ senderName, recipients, packageId, subject, message, expiresAt, hasPasscode }) {
  if (!process.env.SMTP_USER) {
    console.log('[Mailer] SMTP not configured — skipping email');
    return;
  }

  const link = `${process.env.FRONTEND_URL}/receive/${packageId}`;
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:32px">
      <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#0d1523,#111c2e);padding:32px;text-align:center">
          <h1 style="color:#00d4ff;font-size:1.5rem;margin:0">🔐 SecureVault</h1>
          <p style="color:#7a93b4;margin:8px 0 0;font-size:0.9rem">Encrypted File Transfer</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a2d45;margin:0 0 16px">You have a secure package</h2>
          <p style="color:#4a6080;line-height:1.6">
            <strong>${senderName}</strong> has shared encrypted files with you.
            ${message ? `<br><br><em>"${message}"</em>` : ''}
          </p>
          <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0">
            <table style="width:100%;font-size:0.85rem;color:#4a6080">
              <tr><td>📋 Subject:</td><td><strong>${subject || 'Secure Package'}</strong></td></tr>
              <tr><td>⏰ Expires:</td><td>${expiry}</td></tr>
              <tr><td>🔒 Passcode:</td><td>${hasPasscode ? 'Required (sent separately)' : 'None'}</td></tr>
            </table>
          </div>
          <a href="${link}" style="display:block;background:linear-gradient(135deg,#00d4ff,#0094ff);color:#080c14;text-decoration:none;padding:16px 24px;border-radius:12px;text-align:center;font-weight:700;font-size:1rem;margin-bottom:16px">
            📥 Access Secure Package
          </a>
          <p style="color:#9ab0c8;font-size:0.78rem;text-align:center">
            This link expires ${expiry}. Do not forward this email.
          </p>
        </div>
        <div style="background:#f8fafc;padding:16px 32px;text-align:center">
          <p style="color:#9ab0c8;font-size:0.75rem;margin:0">
            Sent via SecureVault · End-to-End Encrypted · SOC 2 Type II
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const promises = recipients.map(email =>
    transporter.sendMail({
      from: `"SecureVault" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to:   email,
      subject: `📦 ${subject || `${senderName} shared secure files with you`}`,
      html
    })
  );

  await Promise.allSettled(promises);
  console.log(`[Mailer] Sent to ${recipients.length} recipient(s)`);
}

module.exports = { sendPackageEmail };
