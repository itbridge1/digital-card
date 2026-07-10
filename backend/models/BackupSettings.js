const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Single-row configuration table (id always = 1) for the scheduled
 * database-backup email feature.
 */
const BackupSettings = sequelize.define(
  "BackupSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    recipientEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "db.itbnepal@gmail.com",
      field: "recipient_email",
      validate: { isEmail: true },
    },
    intervalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: "interval_days",
      validate: { min: 1, max: 365 },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: "Database Backup",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Please find the attached database backup.",
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_sent_at",
    },
  },
  {
    tableName: "backup_settings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = BackupSettings;
