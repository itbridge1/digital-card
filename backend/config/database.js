const { Sequelize } = require("sequelize");

// Initialize Sequelize with MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME || "nfc_platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL Connected:", sequelize.config.host);

    // Sync strategy (safe by default to avoid duplicate key/index explosions)
    const shouldSync = String(process.env.DB_SYNC || "true") === "true";
    const shouldAlter = String(process.env.DB_SYNC_ALTER || "false") === "true";

    if (process.env.NODE_ENV === "development" && shouldSync) {
      if (shouldAlter) {
        await sequelize.sync({ alter: true });
        console.log("Database synced successfully (alter mode)");
      } else {
        await sequelize.sync();
        console.log("Database synced successfully (safe mode)");
      }
    }
  } catch (error) {
    console.error("Unable to connect to MySQL:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
