/**
 * recover-qr-tagids.js
 *
 * One-off recovery for a specific incident: a tenant's cards were deleted and
 * re-imported, generating brand-new random `PENDING-...` tagIds. Physical QR
 * codes had already been printed against the OLD tagIds, so scanning them
 * showed "card not found". The delete routes never clean up
 * `metadata.qrImageUrl` files, so the old QR images are still sitting on disk
 * as orphans (not referenced by any current card).
 *
 * This script:
 *   1. Finds QR image files on disk under uploads/qr/<tenantId>/ that aren't
 *      referenced by any current card (orphaned = printed-but-orphaned).
 *   2. Decodes each PNG's QR payload to recover the OLD tagId that was baked
 *      into the physical card.
 *   3. Matches each orphaned file's original camera filename stem (e.g.
 *      "_dsc0038") against the current cards' metadata.qr / metadata.photo
 *      (those stems are stable across re-imports since they come straight
 *      from the Excel, unlike tagId).
 *   4. Only proceeds with unambiguous 1:1 mappings — a stem is skipped if its
 *      orphaned copies decode to more than one distinct tagId, if no current
 *      card matches its stem, or if the recovered tagId collides with any
 *      currently-active tagId.
 *   5. In --apply mode, re-keys `cards.tagId` (+ businessUrl/publicUrl) and
 *      the matching `card_registers.tag_id` back to the original value,
 *      inside a single transaction, verifying exactly one row changes per
 *      table per mapping before committing.
 *
 * Usage:
 *   node scripts/recover-qr-tagids.js <TENANT_ID>            # dry run (default)
 *   node scripts/recover-qr-tagids.js <TENANT_ID> --apply     # apply for real
 *
 * Reads DB connection from the same env vars as the rest of the app
 * (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME), so pointing this at
 * production is just a matter of running it with production's .env loaded.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { PNG } = require("pngjs");
const jsQR = require("jsqr");

const tenantId = String(process.argv[2] || "").trim().toUpperCase();
const apply = process.argv.includes("--apply");

if (!tenantId) {
  console.error("Usage: node scripts/recover-qr-tagids.js <TENANT_ID> [--apply]");
  process.exit(1);
}

function decodeQrFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const png = PNG.sync.read(buf);
    const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    return result ? result.data : null;
  } catch {
    return null;
  }
}

function extractTagId(qrPayload) {
  const m = String(qrPayload || "").match(/\/view\/([^/?#]+)$/);
  return m ? decodeURIComponent(m[1]).toUpperCase() : null;
}

// disk filename format is {uuid36}_{originalName}.ext
function stemFromDiskName(fname) {
  if (fname.length > 37 && fname[36] === "_") {
    return fname.slice(37).replace(/\.[^.]+$/, "").toLowerCase();
  }
  return fname.replace(/\.[^.]+$/, "").toLowerCase();
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "nfc_platform",
  });

  const [rows] = await conn.execute(
    `SELECT id, tagId, businessUrl, publicUrl,
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.qrImageUrl')) AS qrUrl,
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.qr')) AS qrStem,
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.photo')) AS photoStem
     FROM cards WHERE tenantId = ?`,
    [tenantId],
  );

  const dir = path.join(__dirname, "..", "uploads", "qr", tenantId);
  if (!fs.existsSync(dir)) {
    console.error(`No QR upload directory found for tenant ${tenantId}: ${dir}`);
    await conn.end();
    process.exit(1);
  }

  const filesOnDisk = fs.readdirSync(dir);
  const referenced = new Set(
    rows.map((r) => (r.qrUrl ? path.basename(r.qrUrl) : null)).filter(Boolean),
  );
  const orphaned = filesOnDisk.filter((f) => !referenced.has(f));

  console.log(`Tenant ${tenantId}: ${rows.length} cards, ${filesOnDisk.length} QR files on disk, ${orphaned.length} orphaned.`);

  // stem -> Set(decoded old tagIds)
  const stemToOldTagIds = new Map();
  let decodeFailures = 0;
  for (const f of orphaned) {
    const payload = decodeQrFile(path.join(dir, f));
    const oldTagId = extractTagId(payload);
    if (!oldTagId) {
      decodeFailures++;
      continue;
    }
    const stem = stemFromDiskName(f);
    if (!stemToOldTagIds.has(stem)) stemToOldTagIds.set(stem, new Set());
    stemToOldTagIds.get(stem).add(oldTagId);
  }
  console.log(`Decoded ${orphaned.length - decodeFailures}/${orphaned.length} orphaned files into ${stemToOldTagIds.size} distinct stems.`);

  const cardByStem = new Map();
  for (const r of rows) {
    const stem = (r.qrStem || r.photoStem || "").replace(/\.[^.]+$/, "").toLowerCase();
    if (stem) cardByStem.set(stem, r);
  }
  const activeTagIds = new Set(rows.map((r) => r.tagId.toUpperCase()));

  const mappings = [];
  const skipped = { ambiguous: [], noCard: [], collision: [], alreadyMatching: 0 };

  for (const [stem, tagIdSet] of stemToOldTagIds.entries()) {
    if (tagIdSet.size > 1) {
      skipped.ambiguous.push({ stem, options: [...tagIdSet] });
      continue;
    }
    const oldTagId = [...tagIdSet][0];
    const card = cardByStem.get(stem);
    if (!card) {
      skipped.noCard.push({ stem, oldTagId });
      continue;
    }
    if (card.tagId.toUpperCase() === oldTagId) {
      skipped.alreadyMatching++;
      continue;
    }
    if (activeTagIds.has(oldTagId)) {
      skipped.collision.push({ stem, oldTagId, wouldCollideWith: card.tagId });
      continue;
    }
    mappings.push({ stem, cardId: card.id, currentTagId: card.tagId, oldTagId, businessUrl: card.businessUrl, publicUrl: card.publicUrl });
  }

  console.log(`\nMappings ready to apply: ${mappings.length}`);
  console.log(`Already matching (no-op): ${skipped.alreadyMatching}`);
  console.log(`Skipped — ambiguous decode: ${skipped.ambiguous.length}`);
  console.log(`Skipped — no matching current card: ${skipped.noCard.length}`);
  console.log(`Skipped — would collide with an active tagId: ${skipped.collision.length}`);

  if (skipped.ambiguous.length) console.log("Ambiguous:", JSON.stringify(skipped.ambiguous, null, 2));
  if (skipped.noCard.length) console.log("No current card:", JSON.stringify(skipped.noCard, null, 2));
  if (skipped.collision.length) console.log("Collisions:", JSON.stringify(skipped.collision, null, 2));

  if (!apply) {
    console.log("\nDry run only — pass --apply to write these changes.");
    fs.writeFileSync(
      path.join(__dirname, `recover-qr-tagids.${tenantId}.dryrun.json`),
      JSON.stringify({ mappings, skipped }, null, 2),
    );
    await conn.end();
    return;
  }

  console.log("\nApplying inside a transaction...");
  await conn.beginTransaction();
  try {
    for (const m of mappings) {
      const newBusinessUrl = m.businessUrl ? m.businessUrl.replace(m.currentTagId, m.oldTagId) : m.businessUrl;
      const newPublicUrl = m.publicUrl ? m.publicUrl.replace(m.currentTagId, m.oldTagId) : m.publicUrl;

      const [cardResult] = await conn.execute(
        `UPDATE cards SET tagId = ?, businessUrl = ?, publicUrl = ? WHERE id = ? AND tagId = ?`,
        [m.oldTagId, newBusinessUrl, newPublicUrl, m.cardId, m.currentTagId],
      );
      if (cardResult.affectedRows !== 1) {
        throw new Error(`Expected 1 row updated for card ${m.cardId}, got ${cardResult.affectedRows}`);
      }

      const [regResult] = await conn.execute(
        `UPDATE card_registers SET tag_id = ? WHERE card_id = ? AND tag_id = ?`,
        [m.oldTagId, m.cardId, m.currentTagId],
      );
      if (regResult.affectedRows > 1) {
        throw new Error(`Expected at most 1 card_registers row updated for card ${m.cardId}, got ${regResult.affectedRows}`);
      }
    }
    await conn.commit();
    console.log(`Committed. Re-keyed ${mappings.length} cards.`);
  } catch (err) {
    await conn.rollback();
    console.error("Rolled back due to error:", err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
