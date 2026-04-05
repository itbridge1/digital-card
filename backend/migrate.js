/**
 * Database Migration Runner
 *
 * Reads all files from backend/migrations/ in alphabetical order and runs
 * any that have not yet been recorded in the `migrations` tracking table.
 *
 * Usage:
 *   node migrate.js          — run all pending migrations
 *   node migrate.js --status — list applied / pending migrations
 *   node migrate.js --undo   — roll back the last applied migration
 *
 * Each migration file must export:
 *   { up: async (connection) => { ... },
 *     down: async (connection) => { ... } }
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ── DB connection ────────────────────────────────────────────────────────────
async function getConnection() {
  return mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'nfc_platform',
    multipleStatements: true,
  });
}

// ── Ensure tracking table exists ─────────────────────────────────────────────
async function ensureMigrationsTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

// ── Fetch applied migration names ────────────────────────────────────────────
async function getApplied(conn) {
  const [rows] = await conn.execute('SELECT name FROM migrations ORDER BY id');
  return new Set(rows.map(r => r.name));
}

// ── Load ordered migration files ─────────────────────────────────────────────
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function runMigrations(conn) {
  const applied = await getApplied(conn);
  const files   = getMigrationFiles();
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('✓ No pending migrations.');
    return;
  }

  for (const file of pending) {
    const migration = require(path.join(MIGRATIONS_DIR, file));
    if (typeof migration.up !== 'function') {
      console.warn(`  ⚠ Skipping ${file}: no 'up' export`);
      continue;
    }
    process.stdout.write(`  → Running ${file} … `);
    try {
      await migration.up(conn);
      await conn.execute('INSERT INTO migrations (name) VALUES (?)', [file]);
      console.log('done');
    } catch (err) {
      console.log('FAILED');
      console.error(`    Error: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }
}

async function showStatus(conn) {
  const applied = await getApplied(conn);
  const files   = getMigrationFiles();

  console.log('\nMigration status:');
  console.log('─'.repeat(50));
  for (const file of files) {
    const status = applied.has(file) ? '✓ applied ' : '○ pending ';
    console.log(`  ${status}  ${file}`);
  }

  const dangling = [...applied].filter(n => !files.includes(n));
  if (dangling.length) {
    console.log('\n  ⚠ Applied but file missing:');
    dangling.forEach(n => console.log(`    ${n}`));
  }
  console.log('');
}

async function undoLast(conn) {
  const [rows] = await conn.execute(
    'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
  );
  if (rows.length === 0) {
    console.log('Nothing to undo.');
    return;
  }
  const { name } = rows[0];
  const filePath = path.join(MIGRATIONS_DIR, name);

  if (!fs.existsSync(filePath)) {
    console.error(`Cannot undo: migration file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const migration = require(filePath);
  if (typeof migration.down !== 'function') {
    console.error(`Cannot undo: no 'down' export in ${name}`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`  ← Rolling back ${name} … `);
  try {
    await migration.down(conn);
    await conn.execute('DELETE FROM migrations WHERE name = ?', [name]);
    console.log('done');
  } catch (err) {
    console.log('FAILED');
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  const mode = process.argv[2];
  let conn;

  try {
    conn = await getConnection();
    await ensureMigrationsTable(conn);

    if (mode === '--status') {
      await showStatus(conn);
    } else if (mode === '--undo') {
      await undoLast(conn);
    } else {
      await runMigrations(conn);
    }
  } catch (err) {
    console.error('Migration runner error:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
