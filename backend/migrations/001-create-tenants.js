/**
 * Migration 001 – Create tenants table
 *
 * `createdBy` is stored as a plain INT here (no FK constraint) because the
 * foreign key to users.id would create a circular dependency.
 * The FK is added in migration 003 once the users table exists.
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS tenants (
      id             INT           NOT NULL AUTO_INCREMENT,
      tenantId       VARCHAR(50)   NOT NULL,
      name           VARCHAR(255)  NOT NULL,
      type           ENUM('SCHOOL','HOSPITAL','BUSINESS') NOT NULL,
      contactEmail   VARCHAR(255)  NOT NULL,
      logoUrl        VARCHAR(500)  NULL,
      isActive       TINYINT(1)    NOT NULL DEFAULT 1,
      createdBy      INT           NULL     COMMENT 'User ID of the manager who created this organisation',
      createdAt      DATETIME      NOT NULL,
      updatedAt      DATETIME      NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_tenants_tenantId (tenantId)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const down = async (conn) => {
  await conn.execute('DROP TABLE IF EXISTS tenants');
};

module.exports = { up, down };
