/**
 * Test script to verify NFC reader connectivity
 * This will list all available PC/SC readers
 */

const { NFC } = require('nfc-pcsc');

console.log('Testing NFC Reader Connection...\n');

const nfc = new NFC();

nfc.on('reader', reader => {
  console.log('✓ Reader found:');
  console.log('  Name:', reader.reader.name);
  console.log('  State:', reader.reader.state);
  console.log('');
  console.log('Reader is working! You can now use reader.js');
  
  reader.on('card', card => {
    console.log('\n✓ Card detected:');
    console.log('  UID:', card.uid);
    console.log('  Type:', card.type);
    console.log('');
  });

  reader.on('error', err => {
    console.error('Reader error:', err);
  });
});

nfc.on('error', err => {
  console.error('❌ Error:', err.message);
  console.log('');
  console.log('Troubleshooting:');
  console.log('1. Check if the ACR1311U-N2 reader is connected');
  console.log('2. Ensure you have the necessary drivers installed');
  console.log('3. On Windows, check if Smart Card service is running');
  console.log('4. Try running this script as administrator');
  process.exit(1);
});

console.log('Waiting for reader...');
console.log('(Press Ctrl+C to exit)');
