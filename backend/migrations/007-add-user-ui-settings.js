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
  await conn.execute(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ui_settings JSON NULL DEFAULT NULL
      COMMENT 'Per-user UI preferences stored as JSON'
  `);
};

const down = async (conn) => {
  await conn.execute(`
    ALTER TABLE users DROP COLUMN IF EXISTS ui_settings
  `);
};

module.exports = { up, down };
