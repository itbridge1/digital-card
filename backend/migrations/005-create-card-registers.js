/**
 * Migration 005 – Create card_registers table
 *
 * Links a physical NFC tag (tagId) to a card holder (cardId) within a tenant.
 * `url`         — the short URL written to the NFC chip (max 20 chars)
 * `redirect_url`— the long target URL the chip redirects to
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS card_registers (
      id           INT          NOT NULL AUTO_INCREMENT,
      tag_id       VARCHAR(100) NOT NULL,
      status       ENUM('registered','unregistered','blocked') NOT NULL DEFAULT 'registered',
      url          VARCHAR(20)  NOT NULL,
      redirect_url VARCHAR(500) NULL,
      tenant_id    VARCHAR(50)  NOT NULL,
      user_id      INT          NULL,
      card_id      INT          NULL,
      created_at   DATETIME     NOT NULL,
      updated_at   DATETIME     NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_card_registers_tag_id (tag_id),
      KEY idx_card_registers_tag_id     (tag_id),
      KEY idx_card_registers_tenant_id  (tenant_id),
      KEY idx_card_registers_user_id    (user_id),
      KEY idx_card_registers_status     (status),
      CONSTRAINT fk_card_registers_tenant_id
        FOREIGN KEY (tenant_id) REFERENCES tenants (tenantId)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT fk_card_registers_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
      CONSTRAINT fk_card_registers_card_id
        FOREIGN KEY (card_id) REFERENCES cards (id)
        ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const down = async (conn) => {
  await conn.execute('DROP TABLE IF EXISTS card_registers');
};

module.exports = { up, down };
