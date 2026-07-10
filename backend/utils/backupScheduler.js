/**
 * backupScheduler.js
 *
 * Runs a daily cron at midnight to check whether a scheduled database backup
 * email is due, based on the `backup_settings` table.
 *
 * Scheduling strategy:
 *   – Cron fires every day at 00:05.
 *   – Reads the single settings row (id=1).
 *   – If `enabled` is true AND (lastSentAt is null OR days-since-last-send >= intervalDays),
 *     it triggers sendBackupEmail() and updates `last_sent_at`.
 */

const cron = require("node-cron");
const { sendBackupEmail } = require("./dbBackup");

let scheduledTask = null;

/**
 * Start the nightly backup-check cron job.
 * Should be called once after the database connection is established.
 *
 * @param {import('sequelize').Sequelize} sequelizeInstance - The connected Sequelize instance
 */
function startBackupScheduler(sequelizeInstance) {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  // Fires every day at 00:05
  scheduledTask = cron.schedule("5 0 * * *", async () => {
    await runBackupCheck(sequelizeInstance);
  });

  console.log("[BackupScheduler] Daily backup check scheduled (00:05 every day).");
}

/**
 * Perform the backup-due check and send if needed.
 * Exported so it can also be triggered manually via the admin API.
 *
 * @param {import('sequelize').Sequelize} sequelizeInstance
 */
async function runBackupCheck(sequelizeInstance) {
  try {
    const [rows] = await sequelizeInstance.query(
      "SELECT * FROM backup_settings WHERE id = 1 LIMIT 1",
      { type: sequelizeInstance.QueryTypes.SELECT },
    );

    if (!rows) {
      console.log("[BackupScheduler] No backup_settings row found, skipping.");
      return;
    }

    const settings = rows;

    if (!settings.enabled) {
      console.log("[BackupScheduler] Backup is disabled, skipping.");
      return;
    }

    const now = new Date();
    const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null;
    const intervalMs = (settings.interval_days || 15) * 24 * 60 * 60 * 1000;

    if (lastSent && now - lastSent < intervalMs) {
      const nextDue = new Date(lastSent.getTime() + intervalMs);
      console.log(
        `[BackupScheduler] Next backup due at ${nextDue.toISOString()}, skipping for now.`,
      );
      return;
    }

    console.log("[BackupScheduler] Sending scheduled database backup email…");

    await sendBackupEmail({
      recipientEmail: settings.recipient_email,
      subject: settings.subject,
      message: settings.message,
    });

    await sequelizeInstance.query(
      "UPDATE backup_settings SET last_sent_at = NOW() WHERE id = 1",
    );

    console.log("[BackupScheduler] Backup email sent successfully.");
  } catch (err) {
    console.error("[BackupScheduler] Error during backup check:", err.message);
  }
}

function stopBackupScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = { startBackupScheduler, runBackupCheck, stopBackupScheduler };
