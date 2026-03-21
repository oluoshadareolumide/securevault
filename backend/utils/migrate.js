// ============================================================
// utils/migrate.js — Create all database tables
// Run once: node utils/migrate.js
// ============================================================
require('dotenv').config({ path: '../.env' });
const { query } = require('./db');

async function migrate() {
  console.log('🗄️  Running migrations...\n');

  // ── Users ──────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      name        VARCHAR(255),
      role        VARCHAR(50) DEFAULT 'user',
      plan        VARCHAR(50) DEFAULT 'free',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  users');

  // ── API Keys ────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        VARCHAR(255) NOT NULL,
      key_hash    VARCHAR(255) UNIQUE NOT NULL,
      key_prefix  VARCHAR(20) NOT NULL,
      last_used   TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  api_keys');

  // ── Packages ────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS packages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      subject         VARCHAR(500),
      message         TEXT,
      encryption_mode VARCHAR(50) DEFAULT 'aes256',
      passcode_hash   VARCHAR(255),
      download_limit  INTEGER,
      download_count  INTEGER DEFAULT 0,
      view_count      INTEGER DEFAULT 0,
      disable_download BOOLEAN DEFAULT false,
      watermark       BOOLEAN DEFAULT true,
      expires_at      TIMESTAMPTZ,
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  packages');

  // ── Files ───────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS files (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      original_name VARCHAR(500) NOT NULL,
      stored_name  VARCHAR(500) NOT NULL,
      mime_type    VARCHAR(255),
      size_bytes   BIGINT,
      storage_path VARCHAR(1000),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  files');

  // ── Recipients ──────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS recipients (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      email        VARCHAR(255) NOT NULL,
      notified_at  TIMESTAMPTZ,
      downloaded_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  recipients');

  // ── Activity Log ────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
      package_id   UUID REFERENCES packages(id) ON DELETE CASCADE,
      event_type   VARCHAR(100) NOT NULL,
      actor_email  VARCHAR(255),
      ip_address   VARCHAR(50),
      user_agent   TEXT,
      metadata     JSONB DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  activity_log');

  // ── Webhook Endpoints ───────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url          VARCHAR(1000) NOT NULL,
      secret       VARCHAR(255) NOT NULL,
      events       TEXT[] DEFAULT '{}',
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  webhooks');

  // ── Indexes ─────────────────────────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_packages_sender ON packages(sender_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_files_package ON files(package_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_recipients_package ON recipients(package_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_package ON activity_log(package_id);`);
  console.log('✅  indexes');

  console.log('\n🎉  All migrations complete!\n');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
