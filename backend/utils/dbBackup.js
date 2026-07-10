/**
 * dbBackup.js
 *
 * Exports the MySQL database to a .sql file using the `mysqldump` npm package
 * (pure-JS, no system binary required), then emails it as an attachment via
 * Nodemailer/Gmail SMTP.
 */

const nodemailer = require("nodemailer");
const mysqldump = require("mysqldump");
const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * Dump the database to a temporary .sql file.
 * @returns {Promise<string>} Resolved path to the generated SQL file
 */
async function exportDatabase() {
  const dbName = process.env.DB_NAME || "nfc_platform";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${dbName}_${timestamp}.sql`;
  const filePath = path.join(os.tmpdir(), filename);

  await mysqldump.default({
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: dbName,
    },
    dumpToFile: filePath,
  });

  return filePath;
}

/**
 * Create a reusable Nodemailer transporter from environment variables.
 *
 * Port 465  → implicit TLS  (secure: true)
 * Port 587  → STARTTLS      (secure: false, requireTLS: true)
 * Other     → plain / best-effort
 */
function createTransporter() {
  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const encryption = (process.env.MAIL_ENCRYPTION || "").toLowerCase();

  // For port 465 or explicit "ssl" use implicit TLS; otherwise use STARTTLS
  const useImplicitTLS = port === 465 || encryption === "ssl";

  return nodemailer.createTransport({
    host,
    port,
    secure: useImplicitTLS,
    ...(useImplicitTLS
      ? {}
      : { requireTLS: true }), // force STARTTLS upgrade for port 587
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      // Reject self-signed certs but allow Gmail's valid cert
      rejectUnauthorized: true,
      // Required when connecting to smtp.gmail.com via STARTTLS
      servername: host.match(/^\d+\./) ? "smtp.gmail.com" : host,
    },
  });
}

/**
 * Run a database export and send the SQL file to `settings.recipientEmail`.
 *
 * @param {{ recipientEmail: string, subject?: string, message?: string }} settings
 * @returns {Promise<{ success: boolean, filename: string }>}
 */
async function sendBackupEmail(settings) {
  const transporter = createTransporter();
  let backupPath = null;

  try {
    backupPath = await exportDatabase();

    await transporter.sendMail({
      from: `"NFC Platform Backup" <${process.env.MAIL_USERNAME}>`,
      to: settings.recipientEmail,
      subject: settings.subject || "Database Backup",
      text:
        (settings.message || "Please find the attached database backup.") +
        `\n\nBackup generated at: ${new Date().toISOString()}`,
      attachments: [
        {
          filename: path.basename(backupPath),
          path: backupPath,
        },
      ],
    });

    return { success: true, filename: path.basename(backupPath) };
  } finally {
    // Always clean up the temp file
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        fs.unlinkSync(backupPath);
      } catch (_) {
        // non-fatal
      }
    }
  }
}

module.exports = { sendBackupEmail, exportDatabase };
