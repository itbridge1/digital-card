/**
 * Database Seeder Script for MySQL
 * Populates the database with sample tenants, users, and cards for testing
 *
 * Usage: node seed.js
 */

require("dotenv").config();
const { sequelize, User, Tenant, Card } = require("./models");

// Sample Data
const sampleTenants = [
  {
    tenantId: "SCHOOL_01",
    name: "Lincoln High School",
    type: "SCHOOL",
    contactEmail: "admin@lincoln.edu",
    logoUrl: null,
    isActive: true,
  },
  {
    tenantId: "HOSPITAL_01",
    name: "City Medical Center",
    type: "HOSPITAL",
    contactEmail: "admin@citymedical.com",
    logoUrl: null,
    isActive: true,
  },
  {
    tenantId: "BUSINESS_01",
    name: "TechCorp Inc.",
    type: "BUSINESS",
    contactEmail: "admin@techcorp.com",
    logoUrl: null,
    isActive: true,
  },
];

const sampleUsers = [
  // Platform admin
  {
    name: "ITBridge Admin",
    email: "admin@itb.com",
    password: "ITBridge@622",
    tenantId: "BUSINESS_01",
    role: "admin",
  },
  // Platform manager — manages all organizations
  {
    name: "ITBridge Manager",
    email: "manager@itb.com",
    password: "ITBridge@622",
    tenantId: "BUSINESS_01",
    role: "manager",
  },
];

const sampleCards = [
  // School Cards
  {
    tenantId: "SCHOOL_01",
    tagId: "STUDENT001",
    businessUrl: "http://localhost:5000/t/STUDENT001",
    profileImageUrl: null,
    tapCount: 5,
    metadata: {
      name: "John Doe",
      position: "Student",
      department: "Grade 12 - Section A",
      email: "john@lincoln.edu",
      phone: "+1234567890",
    },
  },
  {
    tenantId: "SCHOOL_01",
    tagId: "TEACHER001",
    businessUrl: "http://localhost:5000/t/TEACHER001",
    profileImageUrl: null,
    tapCount: 12,
    metadata: {
      name: "Prof. Robert Smith",
      position: "Mathematics Teacher",
      department: "Mathematics Department",
      email: "robert.smith@lincoln.edu",
      phone: "+1234567892",
    },
  },

  // Hospital Cards
  {
    tenantId: "HOSPITAL_01",
    tagId: "DOC001",
    businessUrl: "http://localhost:5000/t/DOC001",
    profileImageUrl: null,
    tapCount: 23,
    metadata: {
      name: "Dr. Sarah Smith",
      position: "Cardiologist",
      department: "Cardiology",
      email: "sarah.smith@citymedical.com",
      phone: "+1234567893",
    },
  },
  {
    tenantId: "HOSPITAL_01",
    tagId: "NURSE001",
    businessUrl: "http://localhost:5000/t/NURSE001",
    profileImageUrl: null,
    tapCount: 18,
    metadata: {
      name: "Emily Johnson",
      position: "Registered Nurse",
      department: "Emergency",
      email: "emily.johnson@citymedical.com",
      phone: "+1234567895",
    },
  },

  // Business Cards
  {
    tenantId: "BUSINESS_01",
    tagId: "BUS001",
    businessUrl: "http://localhost:5000/t/BUS001",
    profileImageUrl: null,
    tapCount: 45,
    metadata: {
      name: "Mike Johnson",
      position: "Senior Developer",
      department: "Engineering",
      email: "mike@techcorp.com",
      phone: "+1234567897",
    },
  },
  {
    tenantId: "BUSINESS_01",
    tagId: "BUS002",
    businessUrl: "http://localhost:5000/t/BUS002",
    profileImageUrl: null,
    tapCount: 32,
    metadata: {
      name: "Lisa Brown",
      position: "Senior Product Manager",
      department: "Product",
      email: "lisa@techcorp.com",
      phone: "+1234567898",
    },
  },
];

async function seedDatabase() {
  try {
    console.log("Connecting to MySQL...");
    await sequelize.authenticate();
    console.log("✓ Connected to MySQL\n");

    // Sync all models (create tables)
    console.log("Syncing database schema...");
    await sequelize.sync({ force: true }); // WARNING: This drops all tables
    console.log("✓ Database schema synced\n");

    // Insert tenants
    console.log("Creating organizations...");
    const tenants = await Tenant.bulkCreate(sampleTenants);
    console.log(`✓ Created ${tenants.length} organizations:`);
    tenants.forEach((t) => console.log(`  - ${t.name} (${t.tenantId})`));
    console.log();

    // Insert users
    console.log("Creating users...");
    const users = await User.bulkCreate(sampleUsers, {
      individualHooks: true, // ensures password hashing hooks run
    });
    console.log(`✓ Created ${users.length} users:`);
    users.forEach((u) =>
      console.log(`  - ${u.name} (${u.email}) — Role: ${u.role}`),
    );
    console.log();

    // Insert cards
    console.log("Creating card holders...");
    const cards = await Card.bulkCreate(sampleCards);
    console.log(`✓ Created ${cards.length} card holders:`);
    cards.forEach((c) =>
      console.log(`  - ${c.tagId} (${c.metadata.name}) — Org: ${c.tenantId}`),
    );
    console.log();

    // Display summary
    console.log("═══════════════════════════════════════════════");
    console.log("Database seeded successfully!");
    console.log("═══════════════════════════════════════════════");
    console.log();
    console.log("Organizations:");
    console.log("  SCHOOL_01    — Lincoln High School");
    console.log("  HOSPITAL_01  — City Medical Center");
    console.log("  BUSINESS_01  — TechCorp Inc.");
    console.log();
    console.log("Login accounts:");
    console.log("  admin@itb.com    — Admin   (pw: ITBridge@622)");
    console.log("  manager@itb.com  — Manager (pw: ITBridge@622)");
    console.log();
    console.log("NFC redirect test URLs:");
    console.log("  http://localhost:5000/t/STUDENT001");
    console.log("  http://localhost:5000/t/DOC001");
    console.log("  http://localhost:5000/t/BUS001");
    console.log();
    console.log("API Docs:");
    console.log("  http://localhost:5000/api-docs");
    console.log("═══════════════════════════════════════════════");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log("\nDatabase connection closed.");

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", () => process.exit());
    }
  }
}

seedDatabase();
