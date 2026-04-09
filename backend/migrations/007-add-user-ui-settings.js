/**
 * Migration 007 – Add ui_settings column to users
 *
 * Stores per-user UI preferences (e.g. hidden table columns per org) as a
 * JSON blob so preferences persist across devices / sessions.
 *
 * Shape example:
 *   {
 *     "hiddenCols": {
 *       "ACME": ["_col_photo", "name"],
 *       "GLOBEX": ["_col_publicUrl"]
 *     }
 *   }
 */

const up = async (conn) => {
  const [rows] = await conn.execute(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'ui_settings'
  `);
  if (rows[0].cnt === 0) {
    await conn.execute(`
      ALTER TABLE users
      ADD COLUMN ui_settings JSON NULL DEFAULT NULL
        COMMENT 'Per-user UI preferences stored as JSON'
    `);
  }
};

const down = async (conn) => {
  const [rows] = await conn.execute(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'ui_settings'
  `);
  if (rows[0].cnt > 0) {
    await conn.execute(`ALTER TABLE users DROP COLUMN ui_settings`);
  }
};

module.exports = { up, down };
