/**
 * Database Seeder Script for MySQL
 * Populates the database with sample tenants, users, and cards for testing
 * 
 * Usage: node seed.js
 */

require('dotenv').config();
const { sequelize, User, Tenant, Card } = require('./models');

// Sample Data
const sampleTenants = [
  {
    tenantId: 'SCHOOL_01',
    name: 'Lincoln High School',
    type: 'SCHOOL',
    contactEmail: 'admin@lincoln.edu',
    isActive: true
  },
  {
    tenantId: 'HOSPITAL_01',
    name: 'City Medical Center',
    type: 'HOSPITAL',
    contactEmail: 'admin@citymedical.com',
    isActive: true
  },
  {
    tenantId: 'BUSINESS_01',
    name: 'TechCorp Inc.',
    type: 'BUSINESS',
    contactEmail: 'admin@techcorp.com',
    isActive: true
  }
];

const sampleUsers = [
  // School Admin
  {
    name: 'John Admin',
    email: 'admin@lincoln.edu',
    password: 'password123',
    tenantId: 'SCHOOL_01',
    role: 'admin'
  },
  // Hospital Manager
  {
    name: 'Sarah Manager',
    email: 'sarah@citymedical.com',
    password: 'password123',
    tenantId: 'HOSPITAL_01',
    role: 'manager'
  },
  // Business Viewer
  {
    name: 'Mike Viewer',
    email: 'mike@techcorp.com',
    password: 'password123',
    tenantId: 'BUSINESS_01',
    role: 'viewer'
  }
];

const sampleCards = [
  // School Cards
  {
    tenantId: 'SCHOOL_01',
    tagId: 'STUDENT001',
    businessUrl: 'https://lincoln.edu/student/john-doe',
    tapCount: 5,
    metadata: {
      name: 'John Doe',
      title: 'Student',
      email: 'john@lincoln.edu',
      phone: '+1234567890',
      studentId: '2024001',
      grade: '12',
      section: 'A',
      guardianName: 'Jane Doe',
      guardianPhone: '+1234567891'
    }
  },
  {
    tenantId: 'SCHOOL_01',
    tagId: 'TEACHER001',
    businessUrl: 'https://lincoln.edu/faculty/prof-smith',
    tapCount: 12,
    metadata: {
      name: 'Prof. Robert Smith',
      title: 'Mathematics Teacher',
      email: 'robert.smith@lincoln.edu',
      phone: '+1234567892',
      studentId: 'STAFF2020',
      section: 'Mathematics Department'
    }
  },
  
  // Hospital Cards
  {
    tenantId: 'HOSPITAL_01',
    tagId: 'DOC001',
    businessUrl: 'https://citymedical.com/staff/dr-sarah-smith',
    tapCount: 23,
    metadata: {
      name: 'Dr. Sarah Smith',
      title: 'Cardiologist',
      email: 'sarah.smith@citymedical.com',
      phone: '+1234567893',
      employeeId: 'DOC2024001',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      licenseNumber: 'MD123456',
      emergencyContact: '+1234567894'
    }
  },
  {
    tenantId: 'HOSPITAL_01',
    tagId: 'NURSE001',
    businessUrl: 'https://citymedical.com/staff/nurse-johnson',
    tapCount: 18,
    metadata: {
      name: 'Emily Johnson',
      title: 'Registered Nurse',
      email: 'emily.johnson@citymedical.com',
      phone: '+1234567895',
      employeeId: 'NUR2024001',
      department: 'Emergency',
      licenseNumber: 'RN789012',
      emergencyContact: '+1234567896'
    }
  },
  
  // Business Cards
  {
    tenantId: 'BUSINESS_01',
    tagId: 'BUS001',
    businessUrl: 'https://linkedin.com/in/mike-johnson',
    tapCount: 45,
    metadata: {
      name: 'Mike Johnson',
      title: 'Software Engineer',
      email: 'mike@techcorp.com',
      phone: '+1234567897',
      company: 'TechCorp Inc.',
      position: 'Senior Developer',
      linkedIn: 'https://linkedin.com/in/mike-johnson',
      website: 'https://mikejohnson.dev'
    }
  },
  {
    tenantId: 'BUSINESS_01',
    tagId: 'BUS002',
    businessUrl: 'https://linkedin.com/in/lisa-brown',
    tapCount: 32,
    metadata: {
      name: 'Lisa Brown',
      title: 'Product Manager',
      email: 'lisa@techcorp.com',
      phone: '+1234567898',
      company: 'TechCorp Inc.',
      position: 'Senior Product Manager',
      linkedIn: 'https://linkedin.com/in/lisa-brown',
      website: 'https://lisabrown.io'
    }
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('✓ Connected to MySQL\n');

    // Sync all models (create tables)
    console.log('Syncing database schema...');
    await sequelize.sync({ force: true }); // WARNING: This drops all tables
    console.log('✓ Database schema synced\n');

    // Insert tenants
    console.log('Creating tenants...');
    const tenants = await Tenant.bulkCreate(sampleTenants);
    console.log(`✓ Created ${tenants.length} tenants:`);
    tenants.forEach(t => {
      console.log(`  - ${t.name} (${t.tenantId})`);
    });
    console.log();

    // Insert users
    console.log('Creating users...');
    const users = await User.bulkCreate(sampleUsers);
    console.log(`✓ Created ${users.length} users:`);
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) - Role: ${u.role}`);
    });
    console.log();

    // Insert cards
    console.log('Creating cards...');
    const cards = await Card.bulkCreate(sampleCards);
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
    console.log('  1. SCHOOL_01    - Lincoln High School');
    console.log('  2. HOSPITAL_01  - City Medical Center');
    console.log('  3. BUSINESS_01  - TechCorp Inc.');
    console.log();
    console.log('Sample User Accounts (password: password123):');
    console.log('  1. admin@lincoln.edu    - Admin');
    console.log('  2. sarah@citymedical.com - Manager');
    console.log('  3. mike@techcorp.com     - Viewer');
    console.log();
    console.log('Test the redirects:');
    console.log('  http://localhost:5000/t/STUDENT001');
    console.log('  http://localhost:5000/t/DOC001');
    console.log('  http://localhost:5000/t/BUS001');
    console.log();
    console.log('Login to dashboard with any email above');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
    console.log('Press any key to exit...');
    
    // Wait for user input before exiting (fixes terminal issue on Windows)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.exit();
      });
    }
  }
}

// Run the seeder
seedDatabase();
