/**
 * Seed Script
 * Populates the nfc_platform database with sample data for development/testing.
 * Run create-db.js first, then: npm run seed
 *
 * Tables populated:
 *   tenants        — organizations (SCHOOL / HOSPITAL / BUSINESS)
 *   users          — admin + manager accounts
 *                   tenantId is nullable: admin/manager accounts may not belong
 *                   to any organization (e.g. the seeded manager has tenantId: null)
 *   cards          — NFC card holders
 *                    metadata shape varies by tenant type:
 *                    SCHOOL   : name, studentId (Roll No), grade (Class or "Class(Section)"),
 *                               house, guardianName, address, phone
 *                    HOSPITAL : name, employeeId, department, specialization,
 *                               licenseNumber, emergencyContact, address, email, phone
 *                    BUSINESS : name, company, position, linkedIn, website, address, email, phone
 *                    tagId may be a real NFC UID or a PENDING-<hex> placeholder until a
 *                    physical tag is assigned.
 *   card_registers — NFC chip registration records (links tagId → card → tenant)
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
  // Platform manager — no organization assigned (tenantId is optional for managers)
  {
    name: "ITBridge Manager",
    email: "manager@itb.com",
    password: "ITBridge@622",
    tenantId: null,
    role: "manager",
  },
];

// Derive the frontend base URL from env (same logic as nfcRegistrationService)
const FRONTEND_BASE = (process.env.FRONTEND_URL || "http://localhost:3030").replace(/\/$/, "");
const publicUrl = (tagId) => `${FRONTEND_BASE}/view/${tagId}`;

const sampleCards = [
  // ── SCHOOL cards ──────────────────────────────────────────────────────────
  {
    tenantId: "SCHOOL_01",
    tagId: "STUDENT001",
    businessUrl: publicUrl("STUDENT001"),
    publicUrl: publicUrl("STUDENT001"),
    profileImageUrl: null,
    tapCount: 5,
    metadata: {
      name: "Asmita Tamang",
      studentId: "2",          // Roll No
      grade: "Two(A)",         // Class(Section)
      house: "Blue",
      guardianName: "Rojan Ghising",
      address: "Nayabasti",
      phone: "9863198885",
    },
  },
  {
    tenantId: "SCHOOL_01",
    tagId: "STUDENT002",
    businessUrl: publicUrl("STUDENT002"),
    publicUrl: publicUrl("STUDENT002"),
    profileImageUrl: null,
    tapCount: 3,
    metadata: {
      name: "Bibek Tamang",
      studentId: "3",
      grade: "Two",            // No section
      house: "Green",
      guardianName: "Surya Bahadur Tamang",
      address: "Nayabasti",
      phone: "9845997709",
    },
  },

  // ── HOSPITAL cards ────────────────────────────────────────────────────────
  {
    tenantId: "HOSPITAL_01",
    tagId: "DOC001",
    businessUrl: publicUrl("DOC001"),
    publicUrl: publicUrl("DOC001"),
    profileImageUrl: null,
    tapCount: 23,
    metadata: {
      name: "Dr. Sarah Smith",
      employeeId: "EMP-001",
      department: "Cardiology",
      specialization: "Cardiologist",
      licenseNumber: "NMC-12345",
      emergencyContact: "+1234567800",
      address: "Kathmandu",
      email: "sarah.smith@citymedical.com",
      phone: "+1234567893",
    },
  },
  {
    tenantId: "HOSPITAL_01",
    tagId: "NURSE001",
    businessUrl: publicUrl("NURSE001"),
    publicUrl: publicUrl("NURSE001"),
    profileImageUrl: null,
    tapCount: 18,
    metadata: {
      name: "Emily Johnson",
      employeeId: "EMP-002",
      department: "Emergency",
      specialization: "Registered Nurse",
      licenseNumber: "NMC-67890",
      emergencyContact: "+1234567801",
      address: "Lalitpur",
      email: "emily.johnson@citymedical.com",
      phone: "+1234567895",
    },
  },

  // ── BUSINESS cards ────────────────────────────────────────────────────────
  {
    tenantId: "BUSINESS_01",
    tagId: "BUS001",
    businessUrl: publicUrl("BUS001"),
    publicUrl: publicUrl("BUS001"),
    profileImageUrl: null,
    tapCount: 45,
    metadata: {
      name: "Mike Johnson",
      company: "TechCorp Inc.",
      position: "Senior Developer",
      linkedIn: "linkedin.com/in/mikejohnson",
      website: "https://techcorp.com",
      address: "San Francisco, CA",
      email: "mike@techcorp.com",
      phone: "+1234567897",
    },
  },
  {
    tenantId: "BUSINESS_01",
    tagId: "BUS002",
    businessUrl: publicUrl("BUS002"),
    publicUrl: publicUrl("BUS002"),
    profileImageUrl: null,
    tapCount: 32,
    metadata: {
      name: "Lisa Brown",
      company: "TechCorp Inc.",
      position: "Senior Product Manager",
      linkedIn: "linkedin.com/in/lisabrown",
      website: "https://techcorp.com",
      address: "New York, NY",
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
