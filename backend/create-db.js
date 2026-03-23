/**
 * Database Creation Script
 * Creates the nfc_platform database if it doesn't exist
 * Run this before running seed.js for the first time
 *
 * Tables created by sequelize.sync() in seed.js:
 *   tenants       — organizations (SCHOOL / HOSPITAL / BUSINESS)
 *   users         — admin + manager accounts
 *   cards         — NFC card holders
 *                   includes: tagId, businessUrl, publicUrl (/view/:tagId),
 *                             profileImageUrl, metadata (JSON), tapCount
 *   card_registers — NFC chip registration records
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL server');

    // Create the database
    const dbName = process.env.DB_NAME || 'nfc_platform';
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    console.log(`✓ Database '${dbName}' created successfully!`);
    console.log('\nYou can now run: npm run seed');

  } catch (error) {
    console.error('Error creating database:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the script
createDatabase();
