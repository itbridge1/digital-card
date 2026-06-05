/**
 * fix-ui-settings.js
 * ------------------
 * One-time script to clear corrupted ui_settings values on the production DB.
 *
 * Corruption pattern: ui_settings stored as a char-index object
 *   {"0":"{","1":"\"","2":"0", ...}  (the JSON string spread char-by-char)
 *
 * Usage:
 *   node fix-ui-settings.js
 *   node fix-ui-settings.js --dry-run   (preview only, no changes)
 */
require('dotenv').config();
const { sequelize } = require('./models');

const isDryRun = process.argv.includes('--dry-run');

(async () => {
  try {
    console.log(isDryRun ? '[DRY RUN] No changes will be made.\n' : '');

    // 1. Find affected rows
    const [affected] = await sequelize.query(
      `SELECT id, email, LENGTH(ui_settings) AS bytes
       FROM users
       WHERE ui_settings LIKE '{"0":%'
       ORDER BY id`
    );

    if (affected.length === 0) {
      console.log('No corrupted ui_settings found. Nothing to do.');
      return;
    }

    console.log(`Found ${affected.length} corrupted row(s):`);
    affected.forEach(r =>
      console.log(`  id=${r.id}  email=${r.email}  size=${r.bytes} bytes`)
    );

    if (isDryRun) {
      console.log('\n[DRY RUN] Would set ui_settings = NULL for the rows above.');
      return;
    }

    // 2. Clear them
    const [, meta] = await sequelize.query(
      `UPDATE users SET ui_settings = NULL WHERE ui_settings LIKE '{"0":%'`
    );
    console.log(`\nCleared ${meta.affectedRows} row(s). ui_settings reset to NULL.`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
