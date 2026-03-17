const { Sequelize } = require('sequelize');

const truthyEnvValues = new Set(['1', 'true', 'yes', 'on']);

const parseBooleanEnv = (value, defaultValue = false) => {
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  return truthyEnvValues.has(String(value).trim().toLowerCase());
};

// Initialize Sequelize with MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'nfc_platform',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Connected:', sequelize.config.host);

    const shouldSyncOnStart = parseBooleanEnv(
      process.env.DB_SYNC_ON_START,
      process.env.NODE_ENV !== 'production'
    );
    const shouldAlterSchema = parseBooleanEnv(process.env.DB_SYNC_ALTER, false);

    if (shouldSyncOnStart) {
      const syncOptions = shouldAlterSchema ? { alter: true } : {};
      await sequelize.sync(syncOptions);
      console.log('Database synced successfully');
    }
  } catch (error) {
    console.error('Unable to connect to MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
