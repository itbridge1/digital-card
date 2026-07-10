/**
 * Migration 003 – Add FK from tenants.createdBy → users.id
 *
 * Deferred until after users table exists (circular dependency resolution).
 */

const up = async (conn) => {
  const [rows] = await conn.execute(`
    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tenants'
      AND CONSTRAINT_NAME = 'fk_tenants_createdBy'
  `);
  if (rows.length === 0) {
    await conn.execute(`
      ALTER TABLE tenants
        ADD CONSTRAINT fk_tenants_createdBy
          FOREIGN KEY (createdBy) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE SET NULL
    `);
  }
};

const down = async (conn) => {
  await conn.execute(`
    ALTER TABLE tenants DROP FOREIGN KEY fk_tenants_createdBy
  `);
};

module.exports = { up, down };
