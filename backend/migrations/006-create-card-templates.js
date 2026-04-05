/**
 * Migration 006 – Create card_templates table
 *
 * Stores a per-tenant dynamic field schema used by the card creation form.
 * `fields` is a JSON array of field-definition objects:
 *   [{ key, label, type, required, order, options? }, ...]
 *
 * Supported field types:
 *   text | email | phone | url | textarea | number | date | select
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS card_templates (
      id          INT          NOT NULL AUTO_INCREMENT,
      tenant_id   VARCHAR(50)  NOT NULL,
      name        VARCHAR(100) NOT NULL,
      description VARCHAR(500) NULL,
      fields      JSON         NOT NULL,
      is_default  TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  DATETIME     NOT NULL,
      updated_at  DATETIME     NOT NULL,
      PRIMARY KEY (id),
      KEY idx_card_templates_tenant_id            (tenant_id),
      KEY idx_card_templates_tenant_id_is_default (tenant_id, is_default),
      CONSTRAINT fk_card_templates_tenant_id
        FOREIGN KEY (tenant_id) REFERENCES tenants (tenantId)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const down = async (conn) => {
  await conn.execute('DROP TABLE IF EXISTS card_templates');
};

module.exports = { up, down };
