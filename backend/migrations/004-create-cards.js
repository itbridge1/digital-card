/**
 * Migration 004 – Create cards table
 *
 * Polymorphic per-tenant card holder data.
 * `metadata` stores a JSON blob whose shape varies by tenant type:
 *   SCHOOL   : name, studentId, grade, house, guardianName, address, phone
 *   HOSPITAL : name, employeeId, department, specialization, licenseNumber,
 *              emergencyContact, address, email, phone
 *   BUSINESS : name, company, position, linkedIn, website, address, email, phone
 *
 * `tagId` may be a real NFC UID or a PENDING-<hex> placeholder until a
 * physical chip is assigned to the card.
 */

const up = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id              INT           NOT NULL AUTO_INCREMENT,
      tenantId        VARCHAR(50)   NOT NULL,
      tagId           VARCHAR(100)  NOT NULL,
      businessUrl     VARCHAR(500)  NOT NULL,
      tapCount        INT           NOT NULL DEFAULT 0,
      lastTapped      DATETIME      NULL,
      metadata        JSON          NULL,
      profileImageUrl VARCHAR(500)  NULL,
      publicUrl       VARCHAR(500)  NULL,
      isActive        TINYINT(1)    NOT NULL DEFAULT 1,
      createdAt       DATETIME      NOT NULL,
      updatedAt       DATETIME      NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cards_tagId (tagId),
      KEY idx_cards_tenantId (tenantId),
      KEY idx_cards_tenantId_tagId (tenantId, tagId),
      CONSTRAINT fk_cards_tenantId
        FOREIGN KEY (tenantId) REFERENCES tenants (tenantId)
        ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const down = async (conn) => {
  await conn.execute('DROP TABLE IF EXISTS cards');
};

module.exports = { up, down };
