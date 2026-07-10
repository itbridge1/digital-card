/**
 * routes/admin.js
 *
 * Admin-only endpoints for the database backup scheduler settings.
 *
 * GET  /api/admin/backup-settings          – Fetch current settings
 * PUT  /api/admin/backup-settings          – Update settings
 * POST /api/admin/backup-settings/send-now – Trigger an immediate backup
 */

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const { sequelize } = require("../config/database");
const { sendBackupEmail } = require("../utils/dbBackup");

// All routes require admin auth
router.use(protect, authorize("admin"));

// ── GET /api/admin/backup-settings ───────────────────────────────────────────
router.get("/backup-settings", async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      "SELECT * FROM backup_settings WHERE id = 1 LIMIT 1",
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Settings not found" });
    }

    const s = rows[0];
    return res.json({
      success: true,
      data: {
        recipientEmail: s.recipient_email,
        intervalDays: s.interval_days,
        enabled: Boolean(s.enabled),
        subject: s.subject,
        message: s.message,
        lastSentAt: s.last_sent_at,
      },
    });
  } catch (err) {
    console.error("[Admin] GET backup-settings error:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── PUT /api/admin/backup-settings ───────────────────────────────────────────
router.put(
  "/backup-settings",
  [
    body("recipientEmail").isEmail().withMessage("Valid recipient email required"),
    body("intervalDays")
      .isInt({ min: 1, max: 365 })
      .withMessage("intervalDays must be between 1 and 365"),
    body("enabled").isBoolean().withMessage("enabled must be a boolean"),
    body("subject").optional().isString().isLength({ max: 500 }),
    body("message").optional().isString().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { recipientEmail, intervalDays, enabled, subject, message } = req.body;

    try {
      await sequelize.query(
        `UPDATE backup_settings
         SET recipient_email = ?,
             interval_days   = ?,
             enabled         = ?,
             subject         = ?,
             message         = ?
         WHERE id = 1`,
        {
          replacements: [
            recipientEmail,
            intervalDays,
            enabled ? 1 : 0,
            subject || "Database Backup",
            message || "Please find the attached database backup.",
          ],
        },
      );

      return res.json({ success: true, message: "Backup settings updated" });
    } catch (err) {
      console.error("[Admin] PUT backup-settings error:", err.message);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },
);

// ── POST /api/admin/backup-settings/send-now ─────────────────────────────────
router.post("/backup-settings/send-now", async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      "SELECT * FROM backup_settings WHERE id = 1 LIMIT 1",
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Settings not found" });
    }

    const s = rows[0];

    const result = await sendBackupEmail({
      recipientEmail: s.recipient_email,
      subject: s.subject,
      message: s.message,
    });

    // Update last_sent_at
    await sequelize.query(
      "UPDATE backup_settings SET last_sent_at = NOW() WHERE id = 1",
    );

    return res.json({
      success: true,
      message: `Backup email sent to ${s.recipient_email}`,
      filename: result.filename,
    });
  } catch (err) {
    console.error("[Admin] send-now error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Failed to send backup email" });
  }
});

module.exports = router;
