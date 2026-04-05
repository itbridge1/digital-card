/**
 * Migration 002 – Create users table
 *
 * References tenants(tenantId) via FK.
 * Passwords are hashed by the Sequelize model hook before insertion.
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id                  INT          NOT NULL AUTO_INCREMENT,
      name                VARCHAR(100) NOT NULL,
      email               VARCHAR(255) NOT NULL,
      password            VARCHAR(255) NOT NULL,
      tenantId            VARCHAR(50)  NULL,
      role                ENUM('admin','manager','tenant','viewer') NOT NULL DEFAULT 'viewer',
      isActive            TINYINT(1)   NOT NULL DEFAULT 1,
      mustChangePassword  TINYINT(1)   NOT NULL DEFAULT 0
                            COMMENT 'Forces user to set a new password on next login',
      createdAt           DATETIME     NOT NULL,
      updatedAt           DATETIME     NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      CONSTRAINT fk_users_tenantId
        FOREIGN KEY (tenantId) REFERENCES tenants (tenantId)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const down = async (conn) => {
  await conn.execute('DROP TABLE IF EXISTS users');
};

module.exports = { up, down };
