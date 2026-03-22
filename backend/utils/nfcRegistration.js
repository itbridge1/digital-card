if (false) {
  /**
   * NFC Reader Script for ACR1311U-N2
   *
   * This script:
   * 1. Detects the ACR1311U-N2 reader and reads NFC tag UIDs
   * 2. Generates random 4-character short URLs
   * 3. Saves tags to MySQL database
   * 4. Runs Socket.io WebSocket server for real-time updates
   * 5. Broadcasts NFC scan events to connected clients
   *
   * Requirements:
   * - ACR1311U-N2 reader connected via USB (PC/SC mode)
   * - PC/SC Smart Card daemon running (pre-installed on Windows)
   * - Node.js and nfc-pcsc library
   * - MySQL database running
   *
   * Usage:
   * 1. npm install
   * 2. Update .env with database credentials
   * 3. npm start (starts both server and reader)
   * 4. Open test.html in browser
   * 5. Place NFC tag near the reader
   */

  require("dotenv").config();
  const { NFC } = require("nfc-pcsc");
  const axios = require("axios");
  const mysql = require("mysql2/promise");
  const express = require("express");
  const { Server } = require("socket.io");
  const cors = require("cors");

  // Configuration
  const API_URL = process.env.API_URL || "http://localhost:5000/api";
  const TENANT_ID = process.env.TENANT_ID || "SCHOOL_01";
  const AUTO_REGISTER = process.env.AUTO_REGISTER === "true";
  const DEFAULT_BUSINESS_URL =
    process.env.DEFAULT_BUSINESS_URL || "https://example.com/profile";
  const FRONTEND_URL =
    process.env.FRONTEND_URL || "https://localhost:3030/card/";
  const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

  // Database Configuration
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "nfc_platform",
    port: process.env.DB_PORT || 3306,
  };

  // MySQL Connection Pool
  const pool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Runtime schema flags for compatibility with existing DB structures
  const schemaInfo = {
    tagIdIsNumeric: false,
    tagIdReferencesCards: false,
    hasCreatedAt: false,
    hasUpdatedAt: false,
    hasCreated_at: false,
    hasUpdated_at: false,
  };

  function toDatabaseTagId(rawTagId) {
    const normalized = String(rawTagId)
      .replace(/[^a-fA-F0-9]/g, "")
      .toLowerCase();

    if (!schemaInfo.tagIdIsNumeric) {
      return normalized;
    }

    // Deterministic 32-bit compatible numeric mapping for legacy INT tag_id columns
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash * 31 + normalized.charCodeAt(i)) % 2147483647;
    }
    return hash;
  }

  /**
   * Ensure card_registers schema is compatible with current NFC flow
   */
  async function ensureDatabaseSchema() {
    let connection;
    try {
      connection = await pool.getConnection();
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM card_registers",
      );
      const columnMap = new Map(columns.map((col) => [col.Field, col]));

      // Detect legacy numeric tag_id schemas
      const tagIdColumn = columnMap.get("tag_id");
      schemaInfo.tagIdIsNumeric = !!(
        tagIdColumn && /int\(/i.test(tagIdColumn.Type)
      );

      const [fkRows] = await connection.query(
        `SELECT REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'card_registers'
         AND COLUMN_NAME = 'tag_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL
       LIMIT 1`,
        [dbConfig.database],
      );
      schemaInfo.tagIdReferencesCards =
        fkRows.length > 0 && fkRows[0].REFERENCED_TABLE_NAME === "cards";

      // Ensure camelCase timestamps have defaults if they exist
      const createdAtColumn = columnMap.get("createdAt");
      if (createdAtColumn) {
        try {
          await connection.query(
            "ALTER TABLE card_registers MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
          );
        } catch (error) {
          console.log(
            "⚠ Could not alter createdAt default. Will set createdAt explicitly on insert.",
          );
        }
      }

      const updatedAtColumn = columnMap.get("updatedAt");
      if (updatedAtColumn) {
        try {
          await connection.query(
            "ALTER TABLE card_registers MODIFY updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          );
        } catch (error) {
          console.log(
            "⚠ Could not alter updatedAt default. Will set updatedAt explicitly on writes.",
          );
        }
      }

      // Refresh and cache schema flags
      const [updatedColumns] = await connection.query(
        "SHOW COLUMNS FROM card_registers",
      );
      const updatedFieldNames = new Set(updatedColumns.map((col) => col.Field));
      schemaInfo.hasCreatedAt = updatedFieldNames.has("createdAt");
      schemaInfo.hasUpdatedAt = updatedFieldNames.has("updatedAt");
      schemaInfo.hasCreated_at = updatedFieldNames.has("created_at");
      schemaInfo.hasUpdated_at = updatedFieldNames.has("updated_at");

      if (schemaInfo.tagIdIsNumeric) {
        console.log(
          "⚠ Legacy schema detected: tag_id is INT. Using deterministic numeric UID mapping.",
        );
      }
      if (schemaInfo.tagIdReferencesCards) {
        console.log(
          "⚠ Foreign key detected: card_registers.tag_id -> cards.id. Using cards table mapping.",
        );
      }

      console.log("✓ Database schema check completed");
    } catch (error) {
      console.error("⚠ Schema compatibility check failed:", error.message);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async function resolveCardReferenceId(connection, rawTagId) {
    const normalizedTagId = String(rawTagId)
      .replace(/[^a-fA-F0-9]/g, "")
      .toLowerCase();

    const [existingCards] = await connection.execute(
      "SELECT id FROM cards WHERE tagId = ? LIMIT 1",
      [normalizedTagId],
    );

    if (existingCards.length > 0) {
      const cardId = existingCards[0].id;
      await connection.execute(
        "UPDATE cards SET lastTapped = ?, updatedAt = ? WHERE id = ?",
        [new Date(), new Date(), cardId],
      );
      return cardId;
    }

    const [insertCardResult] = await connection.execute(
      `INSERT INTO cards
      (tenantId, tagId, businessUrl, tapCount, lastTapped, metadata, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        TENANT_ID,
        normalizedTagId,
        DEFAULT_BUSINESS_URL,
        0,
        new Date(),
        JSON.stringify({}),
        1,
        new Date(),
        new Date(),
      ],
    );

    return insertCardResult.insertId;
  }

  // Run schema compatibility check on startup
  ensureDatabaseSchema();

  // Express & Socket.io Setup
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = app.listen(SOCKET_PORT, () => {
    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║     NFC Reader + Socket.io Server                  ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`📡 Socket.io Server: http://localhost:${SOCKET_PORT}`);
    console.log("");
    console.log("Waiting for NFC reader...");
    console.log("");
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track connected clients
  let connectedClients = 0;

  // Socket.io Event Handlers
  io.on("connection", (socket) => {
    connectedClients++;
    console.log(
      `📡 Client connected: ${socket.id} (Total: ${connectedClients})`,
    );

    // Send welcome message
    socket.emit("connect_response", {
      status: "connected",
      message: "WebSocket connected to NFC Reader Server",
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", () => {
      connectedClients--;
      console.log(
        `📡 Client disconnected: ${socket.id} (Total: ${connectedClients})`,
      );
    });

    socket.on("error", (error) => {
      console.error(`❌ Socket error from ${socket.id}:`, error);
    });
  });

  // REST API Endpoints
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/card/:tagId", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT id, tag_id, status, url, tenant_id FROM card_registers WHERE tag_id = ?",
        [req.params.tagId],
      );
      connection.release();

      if (rows.length === 0) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/cards/tenant/:tenantId", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT id, tag_id, status, url, tenant_id FROM card_registers WHERE tenant_id = ?",
        [req.params.tenantId],
      );
      connection.release();

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Function to broadcast NFC update to all connected clients
  function broadcastNFCUpdate(tagId, url, status, fullUrl) {
    io.emit("nfc_update", {
      tagId: tagId,
      url: url,
      shortCode: url,
      fullUrl: fullUrl || `${FRONTEND_URL}${url}`,
      status: status,
      timestamp: new Date().toISOString(),
    });
  }

  function buildNdefUriTlv(url) {
    const uri = String(url || "").trim();

    let prefixCode = 0x00;
    let remainder = uri;
    if (uri.startsWith("https://www.")) {
      prefixCode = 0x02;
      remainder = uri.slice("https://www.".length);
    } else if (uri.startsWith("https://")) {
      prefixCode = 0x04;
      remainder = uri.slice("https://".length);
    } else if (uri.startsWith("http://www.")) {
      prefixCode = 0x01;
      remainder = uri.slice("http://www.".length);
    } else if (uri.startsWith("http://")) {
      prefixCode = 0x03;
      remainder = uri.slice("http://".length);
    }

    const remainderBytes = Buffer.from(remainder, "utf8");
    const payload = Buffer.concat([Buffer.from([prefixCode]), remainderBytes]);

    // NDEF Well Known URI record (short record)
    const ndefRecord = Buffer.concat([
      Buffer.from([0xd1, 0x01, payload.length, 0x55]),
      payload,
    ]);

    // Type 2 Tag TLV: 0x03 <len> <ndef> 0xFE
    if (ndefRecord.length > 0xfe) {
      throw new Error("URL too long for NDEF short record");
    }

    return Buffer.concat([
      Buffer.from([0x03, ndefRecord.length]),
      ndefRecord,
      Buffer.from([0xfe]),
    ]);
  }

  async function writeUrlToCard(reader, card, fullUrl) {
    try {
      const tlv = buildNdefUriTlv(fullUrl);
      const paddedLength = Math.ceil(tlv.length / 4) * 4;
      const data = Buffer.alloc(paddedLength, 0x00);
      tlv.copy(data);

      // Type 2 tags (NTAG / Ultralight-like) user memory starts at page 4
      const startPage = 4;
      for (let offset = 0; offset < data.length; offset += 4) {
        const page = startPage + offset / 4;
        const chunk = data.slice(offset, offset + 4);
        await reader.write(page, chunk, 4);
      }

      console.log(`   ✓ URL written to NFC card memory: ${fullUrl}`);
      return true;
    } catch (error) {
      console.log(`   ⚠ Could not write URL to NFC card: ${error.message}`);
      return false;
    }
  }

  // Initialize NFC reader
  const nfc = new NFC();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     NFC Tag Reader - ACR1311U-N2                     ║");
  console.log("║     Enhanced with Better Detection                   ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Configuration:");
  console.log("  Tenant ID:", TENANT_ID);
  console.log("  Database:", dbConfig.database);
  console.log("  Socket.io Port:", SOCKET_PORT);
  console.log("");
  console.log("🔍 Searching for NFC readers...");
  console.log("");

  let readerFound = false;
  let activeReaders = [];

  // Reader detected event
  nfc.on("reader", (reader) => {
    readerFound = true;
    const readerName = reader.reader.name;

    if (!activeReaders.includes(readerName)) {
      activeReaders.push(readerName);
    }

    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║            ✓ READER DETECTED & READY!                 ║");
    console.log("╚═══════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`📖 Reader Name: ${readerName}`);
    console.log(`📊 Status: ${reader.reader.state}`);
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  📱 READY! Please place your NFC tag near the reader");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Card detected event with better polling
    reader.on("card", async (card) => {
      const uid = card.uid;
      const timestamp = new Date().toLocaleString();
      const timeMs = new Date().getTime();

      console.log("");
      console.log("╔═══════════════════════════════════════════════════════╗");
      console.log("║              🎉 NFC TAG DETECTED! 🎉                  ║");
      console.log("╚═══════════════════════════════════════════════════════╝");
      console.log("");
      console.log(`  📱 Tag UID: ${uid}`);
      console.log(`  🏷️  Type: ${card.type || "Unknown Type"}`);
      console.log(`  ⏰ Time: ${timestamp}`);
      console.log("");

      // Save to database with real-time broadcast
      const scanResult = await saveTagToDatabase(uid);

      // Write generated URL on card itself (best-effort)
      if (scanResult && scanResult.fullUrl) {
        await writeUrlToCard(reader, card, scanResult.fullUrl);
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  ⏳ Waiting for next tag...   (remove current tag)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
    });

    // Card removed event
    reader.on("card.off", (card) => {
      console.log(`  ✓ Tag removed: ${card.uid}`);
      console.log("  ⏳ Ready for next scan...");
      console.log("");
    });

    // Reader error event - with recovery
    reader.on("error", (err) => {
      console.error("");
      console.error("❌ READER ERROR:", err.message);
      console.error("");
      console.log("🔄 Attempting recovery...");
      console.log("");
    });
  });

  // NFC library error event with detailed diagnostics
  nfc.on("error", (err) => {
    console.error("");
    console.error("╔═══════════════════════════════════════════════════════╗");
    console.error("║              ❌ NFC ERROR - DIAGNOSIS                  ║");
    console.error("╚═══════════════════════════════════════════════════════╝");
    console.error("");
    console.error("  Error:", err.message);
    console.error("");

    if (err.message.includes("No readers")) {
      console.log("📋 TROUBLESHOOTING - No PC/SC Readers Found:");
      console.log("");
      console.log("  1. ✓ Check Hardware Connection:");
      console.log("     └─ Is ACR1311U-N2 connected to USB?");
      console.log("     └─ Check Device Manager (Windows) or lsusb (Linux)");
      console.log("");
      console.log("  2. ✓ Check PC/SC Service:");
      console.log("     └─ Windows: Ensure Smart Card service is running");
      console.log(
        "     └─ Linux: Install libpcsclite (sudo apt install libpcsclite-dev)",
      );
      console.log("     └─ macOS: Should be built-in");
      console.log("");
      console.log("  3. ✓ Try These Steps:");
      console.log("     └─ Unplug reader, wait 5 seconds, plug back in");
      console.log("     └─ Stop this script (Ctrl+C)");
      console.log("     └─ Restart: npm start");
      console.log("");
    } else {
      console.log("  Error Code:", err.code);
      console.log("");
      console.log("  Try:");
      console.log("  1. Restart the reader");
      console.log("  2. Restart this script");
      console.log("  3. Check system logs");
      console.log("");
    }

    console.log("⏳ Retrying in 5 seconds...");
    console.log("");
  });

  /**
   * Generate a random 4-character string
   */
  function generateRandomString() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get MySQL connection
   */
  async function getConnection() {
    try {
      const connection = await mysql.createConnection(dbConfig);
      return connection;
    } catch (error) {
      console.error("❌ Database connection failed:", error.message);
      throw error;
    }
  }

  /**
   * Save tag to database and generate short URL
   */
  async function saveTagToDatabase(tagId) {
    let connection;
    try {
      connection = await pool.getConnection();
      const dbTagId = schemaInfo.tagIdReferencesCards
        ? await resolveCardReferenceId(connection, tagId)
        : toDatabaseTagId(tagId);

      // Always generate a new short code for every scan
      let randomString;
      let attempts = 0;
      let codeExists = true;

      while (codeExists && attempts < 10) {
        randomString = generateRandomString();
        const [codeRows] = await connection.execute(
          "SELECT id FROM card_registers WHERE url = ? AND tenant_id = ? LIMIT 1",
          [randomString, TENANT_ID],
        );
        codeExists = codeRows.length > 0;
        attempts++;
      }

      if (codeExists) {
        throw new Error("Unable to generate unique short code. Please retry.");
      }

      const shortUrl = `${FRONTEND_URL}${randomString}`;

      // Check if tag already exists for this tenant
      const [existingRows] = await connection.execute(
        "SELECT id FROM card_registers WHERE tag_id = ? AND tenant_id = ?",
        [dbTagId, TENANT_ID],
      );

      if (existingRows.length > 0) {
        // Update existing card with brand-new URL on every scan
        const existingCardId = existingRows[0].id;
        await connection.execute(
          `UPDATE card_registers
         SET url = ?, status = ?${schemaInfo.hasUpdatedAt ? ", updatedAt = ?" : ""}${schemaInfo.hasUpdated_at ? ", updated_at = ?" : ""}
         WHERE id = ?`,
          [
            randomString,
            "registered",
            ...(schemaInfo.hasUpdatedAt ? [new Date()] : []),
            ...(schemaInfo.hasUpdated_at ? [new Date()] : []),
            existingCardId,
          ],
        );

        console.log("   ✓ Existing tag updated with NEW URL");
        console.log(`   Previous record ID: ${existingCardId}`);
        console.log(`   New Short URL: ${shortUrl}`);
        console.log(`   New Random String: ${randomString}`);

        // Broadcast real-time update to all clients
        broadcastNFCUpdate(tagId, randomString, "registered", shortUrl);
        console.log("   ✓ Real-time update sent to all connected clients");
        return {
          tagId,
          shortCode: randomString,
          fullUrl: shortUrl,
          status: "registered",
        };
      }

      // Insert new card record
      const insertColumns = ["tag_id", "status", "url", "tenant_id"];
      const insertValues = [dbTagId, "registered", randomString, TENANT_ID];

      if (schemaInfo.hasCreatedAt) {
        insertColumns.push("createdAt");
        insertValues.push(new Date());
      }
      if (schemaInfo.hasUpdatedAt) {
        insertColumns.push("updatedAt");
        insertValues.push(new Date());
      }
      if (schemaInfo.hasCreated_at) {
        insertColumns.push("created_at");
        insertValues.push(new Date());
      }
      if (schemaInfo.hasUpdated_at) {
        insertColumns.push("updated_at");
        insertValues.push(new Date());
      }

      const insertSql = `INSERT INTO card_registers (${insertColumns.join(", ")}) VALUES (${insertColumns.map(() => "?").join(", ")})`;
      const [result] = await connection.execute(insertSql, insertValues);

      console.log("   ✓ Tag saved to database");
      console.log(`   Short URL: ${shortUrl}`);
      console.log(`   Random String: ${randomString}`);

      // Broadcast to all WebSocket clients
      broadcastNFCUpdate(tagId, randomString, "registered", shortUrl);
      console.log("   ✓ Real-time update sent to all connected clients");

      return {
        tagId,
        shortCode: randomString,
        fullUrl: shortUrl,
        status: "registered",
      };
    } catch (error) {
      if (error.code === "PROTOCOL_CONNECTION_LOST") {
        console.log("   ❌ Database connection lost");
      } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
        console.log("   ❌ Database access denied - check credentials");
      } else if (error.code === "ER_BAD_DB_ERROR") {
        console.log("   ❌ Database does not exist");
      } else {
        console.log("   ❌ Database error:", error.message);
      }
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (err) {
          // Connection already released
        }
      }
    }
    console.log("");
    return null;
  }

  /**
   * Register tag in the database (Legacy - not used with WebSocket)
   */
  async function registerTag(tagId) {
    try {
      console.log("   Registering tag in database...");

      const response = await axios.post(
        `${API_URL}/cards`,
        {
          tagId: tagId,
          businessUrl: DEFAULT_BUSINESS_URL,
          tenantId: TENANT_ID,
          metadata: {
            name: "",
            title: "",
            email: "",
            phone: "",
          },
        },
        {
          headers: {
            "x-tenant-id": TENANT_ID,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        console.log("   ✓ Tag registered successfully!");
        console.log(`   Short URL: ${response.data.redirectUrl}`);
        console.log("   → Update card details in the dashboard");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log("   ℹ Tag already registered in the system");

        // Fetch existing card details
        try {
          const cardResponse = await axios.get(`${API_URL}/cards/${tagId}`, {
            headers: { "x-tenant-id": TENANT_ID },
          });
          const card = cardResponse.data.data;
          console.log(`   Name: ${card.metadata?.name || "Not set"}`);
          console.log(`   Taps: ${card.tapCount}`);
        } catch (err) {
          // Card exists but belongs to different tenant
          console.log("   (Card belongs to a different tenant)");
        }
      } else if (error.response?.data?.error) {
        console.log(`   ❌ Registration failed: ${error.response.data.error}`);
      } else if (error.code === "ECONNREFUSED") {
        console.log("   ❌ Cannot connect to API server");
        console.log("   → Make sure the backend server is running");
      } else {
        console.log("   ❌ Registration failed:", error.message);
      }
    }
    console.log("");
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("");
    console.log("Shutting down NFC Reader + Socket.io Server...");
    io.close();
    pool.end();
    process.exit(0);
  });

  // Keep the script running
  process.stdin.resume();
}

module.exports = require("./nfcRegistrationService");
