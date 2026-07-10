/**
 * Migration 008 – Create backup_settings table
 *
 * Stores a single configuration row (id=1) for the scheduled DB backup
 * email feature.  The row is inserted on first run with safe defaults.
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS backup_settings (
      id              INT           NOT NULL DEFAULT 1,
      recipient_email VARCHAR(255)  NOT NULL DEFAULT 'db.itbnepal@gmail.com',
      interval_days   INT           NOT NULL DEFAULT 15,
      enabled         TINYINT(1)    NOT NULL DEFAULT 1,
      subject         VARCHAR(500)      NULL DEFAULT 'Database Backup',
      message         TEXT              NULL,
      last_sent_at    DATETIME          NULL,
      created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Upsert the default row so it always exists
  await conn.execute(`
    INSERT IGNORE INTO backup_settings
      (id, recipient_email, interval_days, enabled, subject, message)
    VALUES
      (1, 'db.itbnepal@gmail.com', 15, 1, 'Database Backup', 'Please find the attached database backup.')
  `);
};

const down = async (conn) => {
  await conn.execute(`DROP TABLE IF EXISTS backup_settings`);
};

module.exports = { up, down };
