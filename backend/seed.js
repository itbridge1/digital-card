/**
 * Database Seeder Script
 * Populates the database with sample tenants and cards for testing
 * 
 * Usage: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('./models/Tenant');
const Card = require('./models/Card');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nfc-platform';

// Sample Data
const sampleTenants = [
  {
    tenantId: 'SCH001',
    name: 'Everest Secondary School',
    type: 'SCHOOL',
    contactEmail: 'info@everestschool.edu.np',
    isActive: true
  },
  {
    tenantId: 'HSP001',
    name: 'Kathmandu City Hospital',
    type: 'HOSPITAL',
    contactEmail: 'contact@kchospital.com',
    isActive: true
  },
  {
    tenantId: 'BUS001',
    name: 'Shrestha Trading Pvt Ltd',
    type: 'BUSINESS',
    contactEmail: 'admin@shresthatrading.com',
    isActive: false
  },
  {
    tenantId: 'SCH002',
    name: 'Himalayan Public School',
    type: 'SCHOOL',
    contactEmail: 'office@hps.edu.np',
    isActive: true
  },
  {
    tenantId: 'HSP002',
    name: 'Birat Medical Center',
    type: 'HOSPITAL',
    contactEmail: 'support@biratmedical.com',
    isActive: true
  }
];

const sampleCards = [
  {
    tenantId: 'SCH001',
    tagId: 'NFC10001',
    businessUrl: 'https://everestschool.edu.np/student-profile',
    tapCount: 5,
    lastTapped: new Date('2026-03-01T10:00:00.000Z'),
    metadata: {
      name: 'Aarav Shrestha',
      studentId: 'STU2026001',
      grade: '10',
      section: 'A',
      guardianName: 'Ramesh Shrestha',
      guardianPhone: '9800000001'
    },
    isActive: true
  },
  {
    tenantId: 'HSP001',
    tagId: 'NFC20001',
    businessUrl: 'https://kchospital.com/doctor-profile',
    tapCount: 12,
    lastTapped: new Date('2026-03-01T12:30:00.000Z'),
    metadata: {
      name: 'Dr. Priya Sharma',
      employeeId: 'DOC102',
      department: 'Cardiology',
      specialization: 'Heart Specialist',
      licenseNumber: 'LIC789456',
      emergencyContact: '9811111111',
      email: 'priya.sharma@kchospital.com',
      phone: '9800000002'
    },
    isActive: true
  },
  {
    tenantId: 'BUS001',
    tagId: 'NFC30001',
    businessUrl: 'https://shresthatrading.com/profile',
    tapCount: 3,
    lastTapped: new Date('2026-02-28T08:45:00.000Z'),
    metadata: {
      name: 'Rajan Shrestha',
      company: 'Shrestha Trading Pvt Ltd',
      position: 'Managing Director',
      linkedIn: 'https://linkedin.com/in/rajan-shrestha',
      website: 'https://shresthatrading.com',
      email: 'rajan@shresthatrading.com',
      phone: '9800000003'
    },
    isActive: true
  },
  {
    tenantId: 'SCH002',
    tagId: 'NFC10002',
    businessUrl: 'https://hps.edu.np/student-profile',
    tapCount: 0,
    metadata: {
      name: 'Sita Karki',
      studentId: 'STU2026002',
      grade: '9',
      section: 'B',
      guardianName: 'Maya Karki',
      guardianPhone: '9800000004'
    },
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await Tenant.deleteMany({});
    await Card.deleteMany({});
    console.log('✓ Cleared existing data\n');

    // Insert tenants
    console.log('Creating tenants...');
    const tenants = await Tenant.insertMany(sampleTenants);
    console.log(`✓ Created ${tenants.length} tenants:`);
    tenants.forEach(t => {
      console.log(`  - ${t.name} (${t.tenantId})`);
    });
    console.log();

    // Insert cards
    console.log('Creating cards...');
    const cards = await Card.insertMany(sampleCards);
    console.log(`✓ Created ${cards.length} cards:`);
    cards.forEach(c => {
      console.log(`  - ${c.tagId} (${c.metadata.name}) - Tenant: ${c.tenantId}`);
    });
    console.log();

    // Display summary
    console.log('═══════════════════════════════════════════════');
    console.log('Database seeded successfully! 🎉');
    console.log('═══════════════════════════════════════════════');
    console.log();
    console.log('Sample Tenants:');
    console.log('  1. SCH001 - Everest Secondary School');
    console.log('  2. HSP001 - Kathmandu City Hospital');
    console.log('  3. BUS001 - Shrestha Trading Pvt Ltd (Inactive)');
    console.log('  4. SCH002 - Himalayan Public School');
    console.log('  5. HSP002 - Birat Medical Center');
    console.log();
    console.log('Test the redirects:');
    console.log('  http://localhost:5000/t/NFC10001');
    console.log('  http://localhost:5000/t/NFC20001');
    console.log('  http://localhost:5000/t/NFC30001');
    console.log();
    console.log('Login to dashboard with any tenant ID above');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// Run the seeder
seedDatabase();
