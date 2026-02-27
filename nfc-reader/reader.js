/**
 * NFC Reader Script for ACR1311U-N2
 * 
 * This script detects the ACR1311U-N2 reader, reads NFC tag UIDs,
 * and automatically registers them in the database.
 * 
 * Requirements:
 * - ACR1311U-N2 reader connected via USB (PC/SC mode)
 * - PC/SC Smart Card daemon running (pre-installed on Windows)
 * - Node.js and nfc-pcsc library
 * 
 * Usage:
 * 1. npm install
 * 2. Copy .env.example to .env and configure
 * 3. npm start
 * 4. Place NFC tag near the reader
 */

require('dotenv').config();
const { NFC } = require('nfc-pcsc');
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TENANT_ID = process.env.TENANT_ID || 'SCHOOL_01';
const AUTO_REGISTER = process.env.AUTO_REGISTER === 'true';
const DEFAULT_BUSINESS_URL = process.env.DEFAULT_BUSINESS_URL || 'https://example.com/profile';

// Initialize NFC reader
const nfc = new NFC();

console.log('╔══════════════════════════════════════════════╗');
console.log('║     NFC Tag Reader - ACR1311U-N2             ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log('Configuration:');
console.log('  API URL:', API_URL);
console.log('  Tenant ID:', TENANT_ID);
console.log('  Auto Register:', AUTO_REGISTER);
console.log('');
console.log('Waiting for NFC reader...');
console.log('');

// Reader detected event
nfc.on('reader', reader => {
  console.log('✓ Reader detected:', reader.reader.name);
  console.log('  Status:', reader.reader.state);
  console.log('');
  console.log('Ready! Place an NFC tag near the reader...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Card detected event
  reader.on('card', async card => {
    const uid = card.uid;
    const timestamp = new Date().toLocaleString();

    console.log(`📱 NFC Tag Detected!`);
    console.log(`   UID: ${uid}`);
    console.log(`   Type: ${card.type || 'Unknown'}`);
    console.log(`   Time: ${timestamp}`);
    console.log('');

    if (AUTO_REGISTER) {
      await registerTag(uid);
    } else {
      console.log('   Auto-register is disabled. Tag not registered.');
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  });

  // Card removed event
  reader.on('card.off', card => {
    console.log(`   Tag removed: ${card.uid}`);
    console.log('');
  });

  // Reader error event
  reader.on('error', err => {
    console.error('❌ Reader error:', err);
  });
});

// NFC library error event
nfc.on('error', err => {
  console.error('❌ NFC error:', err);
  if (err.message.includes('No PC/SC Readers')) {
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Ensure ACR1311U-N2 is connected via USB');
    console.log('  2. Check if Smart Card service is running (Windows)');
    console.log('  3. Try unplugging and replugging the reader');
    console.log('  4. Restart the script');
  }
});

/**
 * Register tag in the database
 */
async function registerTag(tagId) {
  try {
    console.log('   Registering tag in database...');

    const response = await axios.post(`${API_URL}/cards`, {
      tagId: tagId,
      businessUrl: DEFAULT_BUSINESS_URL,
      tenantId: TENANT_ID,
      metadata: {
        name: '',
        title: '',
        email: '',
        phone: ''
      }
    }, {
      headers: {
        'x-tenant-id': TENANT_ID,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('   ✓ Tag registered successfully!');
      console.log(`   Short URL: ${response.data.redirectUrl}`);
      console.log('   → Update card details in the dashboard');
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('   ℹ Tag already registered in the system');
      
      // Fetch existing card details
      try {
        const cardResponse = await axios.get(`${API_URL}/cards/${tagId}`, {
          headers: { 'x-tenant-id': TENANT_ID }
        });
        const card = cardResponse.data.data;
        console.log(`   Name: ${card.metadata?.name || 'Not set'}`);
        console.log(`   Taps: ${card.tapCount}`);
      } catch (err) {
        // Card exists but belongs to different tenant
        console.log('   (Card belongs to a different tenant)');
      }
    } else if (error.response?.data?.error) {
      console.log(`   ❌ Registration failed: ${error.response.data.error}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Cannot connect to API server');
      console.log('   → Make sure the backend server is running');
    } else {
      console.log('   ❌ Registration failed:', error.message);
    }
  }
  console.log('');
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('Shutting down reader...');
  process.exit(0);
});

// Keep the script running
process.stdin.resume();
