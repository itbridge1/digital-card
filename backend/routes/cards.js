const express = require("express");
const router = express.Router();
const { Card, CardRegister, User, Tenant } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { Op } = require("sequelize");
const { registerNfcCard } = require("../utils/nfcRegistration");
const { getIO } = require("../utils/socket");
const multer = require("multer");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /xlsx|xls|csv/i;
    const extOk = allowed.test(file.originalname.split(".").pop());
    if (extOk) cb(null, true);
    else cb(new Error("Only .xlsx, .xls, or .csv files are allowed"));
  },
});

function normalizeRegistrationStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (value === "active") return "registered";
  if (value === "inactive") return "unregistered";
  if (value === "blocked") return "blocked";
  return value;
}

/**
 * For rows without a tagId, try to find an existing card in the same tenant
 * by matching on the best available unique identifier (studentId > employeeId > name).
 * Returns the existing tagId if found, or null.
 */
async function findExistingCardTagId(tenantId, metadata) {
  const { sequelize } = require('../config/database');
  // Prefer a stable ID field — check common keys in order
  const candidates = [
    'studentId', 'employeeId', 'rollNo', 'admissionNo', 'staffId', 'name',
  ];
  for (const field of candidates) {
    const value = metadata[field];
    if (!value) continue;
    const [rows] = await sequelize.query(
      `SELECT tagId FROM cards
       WHERE tenantId = :tenantId
         AND JSON_UNQUOTE(JSON_EXTRACT(metadata, :path)) = :value
       LIMIT 1`,
      { replacements: { tenantId, path: `$.${field}`, value: String(value) } }
    );
    if (rows[0]?.tagId) return rows[0].tagId;
  }
  return null;
}

/**
 * Convert date cells (produced by cellDates:true) to dd/mm/yyyy strings
 * so the full 4-digit year is always preserved regardless of the cell's
 * number format code (e.g. built-in m/d/yy truncates to 2 digits).
 */
function normalizeDateCells(sheet) {
  Object.keys(sheet).forEach(addr => {
    if (addr[0] === '!') return;
    const cell = sheet[addr];
    // Only process numeric cells that have a date-type format string
    // cell.z is populated by cellNF:true and contains the format string
    if (cell.t === 'n' && cell.z && typeof cell.v === 'number') {
      // Date formats contain y/m/d tokens; number formats contain 0/#/?
      if (!/[ymd]/i.test(cell.z) || /[0#?]/.test(cell.z)) return;
      try {
        // Pure arithmetic — no JS Date, no timezone conversion
        const formatted = XLSX.SSF.format('dd/mm/yyyy', cell.v);
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) return;
        cell.t = 's';
        cell.v = formatted;
        cell.w = formatted;
      } catch { /* not a date cell, leave as-is */ }
    }
  });
}

function buildBusinessUrl(tagId) {
  const base = (
    process.env.TAG_WRITE_BASE_URL ||
    `${(process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "")}/card`
  ).replace(/\/$/, "");
  return `${base}/${encodeURIComponent(tagId)}`;
}

// Helper – silently remove a stored profile image file
function deleteProfileImage(profileImageUrl) {
  if (!profileImageUrl) return;
  try {
    const filePath = path.join(__dirname, "..", profileImageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn("Could not delete profile image:", e.message);
  }
}

// Protect all routes - require authentication
router.use(protect);

/**
 * GET /api/cards
 * List all cards for the authenticated user's tenant
 */
router.get("/", async (req, res) => {
  try {
    const cards = await Card.findAll({
      where: { tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      count: cards.length,
      data: cards,
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch cards",
    });
  }
});

/**
 * GET /api/cards/registrations
 * List all card registrations for admin panel
 */
router.get("/registrations", authorize("admin"), async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const where = {};
    if (req.query.tenantId) {
      where.tenantId = String(req.query.tenantId).toUpperCase();
    }

    const rows = await CardRegister.findAll({
      where,
      include: [
        { model: User, attributes: ["id", "name", "email", "tenantId"] },
        { model: Tenant, attributes: ["tenantId", "name", "type"] },
        {
          model: Card,
          attributes: ["id", "tagId", "businessUrl", "publicUrl", "isActive"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch card registrations",
    });
  }
});

/**
 * PUT /api/cards/registrations/:tagId
 * Update card registration fields by tag ID (status + redirectUrl + optional tenant)
 */
router.put("/registrations/:tagId", authorize("admin"), async (req, res) => {
  try {
    const tagId = String(req.params.tagId || "")
      .trim()
      .toUpperCase();

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: "tagId is required",
      });
    }

    const registration = await CardRegister.findOne({
      where: { tagId },
      include: [{ model: Card }],
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Card registration not found",
      });
    }

    const hasStatus = Object.prototype.hasOwnProperty.call(req.body, "status");
    const hasRedirectUrl = Object.prototype.hasOwnProperty.call(
      req.body,
      "redirectUrl",
    );
    const hasTenantId = Object.prototype.hasOwnProperty.call(
      req.body,
      "tenantId",
    );

    if (!hasStatus && !hasRedirectUrl && !hasTenantId) {
      return res.status(400).json({
        success: false,
        error:
          "At least one field is required: status, redirectUrl, or tenantId",
      });
    }

    if (hasStatus) {
      const normalizedStatus = normalizeRegistrationStatus(req.body.status);
      const allowedStatuses = ["registered", "unregistered", "blocked"];

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error:
            "status must be active/inactive or registered/unregistered/blocked",
        });
      }

      registration.status = normalizedStatus;

      if (registration.Card) {
        registration.Card.isActive = normalizedStatus === "registered";
        await registration.Card.save();
      }
    }

    if (hasRedirectUrl) {
      const nextRedirect = String(req.body.redirectUrl || "").trim();
      registration.redirectUrl = nextRedirect || null;
    }

    if (hasTenantId) {
      const rawTenantId = String(req.body.tenantId || "").trim();

      if (rawTenantId) {
        const tenantWhere = /^\d+$/.test(rawTenantId)
          ? {
              isActive: true,
              [Op.or]: [
                { id: Number(rawTenantId) },
                { tenantId: rawTenantId.toUpperCase() },
              ],
            }
          : {
              isActive: true,
              tenantId: rawTenantId.toUpperCase(),
            };

        const tenant = await Tenant.findOne({ where: tenantWhere });
        if (!tenant) {
          return res.status(400).json({
            success: false,
            error: "Invalid tenantId",
          });
        }

        registration.tenantId = tenant.tenantId;
        if (registration.Card) {
          registration.Card.tenantId = tenant.tenantId;
          await registration.Card.save();
        }
      }
    }

    await registration.save();

    const updatedRegistration = await CardRegister.findOne({
      where: { tagId },
      include: [
        { model: User, attributes: ["id", "name", "email", "tenantId"] },
        { model: Tenant, attributes: ["tenantId", "name", "type"] },
        {
          model: Card,
          attributes: ["id", "tagId", "businessUrl", "publicUrl", "isActive"],
        },
      ],
    });

    const io = getIO();
    if (io) {
      io.emit("nfc_update", {
        event: "card_updated",
        tag_id: updatedRegistration.tagId,
        status: updatedRegistration.status,
        url: updatedRegistration.url,
        redirect_url: updatedRegistration.redirectUrl,
        tenant_id: updatedRegistration.tenantId,
        user_id: updatedRegistration.userId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Card registration updated successfully",
      data: updatedRegistration,
    });
  } catch (error) {
    console.error("Error updating card registration:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update card registration",
    });
  }
});

/**
 * DELETE /api/cards/registrations/:tagId
 * Delete registration by tag ID (admin)
 */
router.delete("/registrations/:tagId", authorize("admin"), async (req, res) => {
  try {
    const tagId = String(req.params.tagId || "")
      .trim()
      .toUpperCase();

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: "tagId is required",
      });
    }

    const registration = await CardRegister.findOne({
      where: { tagId },
      include: [{ model: Card }],
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Card registration not found",
      });
    }

    if (registration.Card) {
      registration.Card.isActive = false;
      await registration.Card.save();
    }

    await registration.destroy();

    const io = getIO();
    if (io) {
      io.emit("nfc_update", {
        event: "card_deleted",
        tag_id: tagId,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: "Card registration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting card registration:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete card registration",
    });
  }
});

/**
 * POST /api/cards/registrations/scan
 * Upsert registration on NFC scan and return editable row.
 * IMPORTANT: Existing tags keep their current short URL.
 */
router.post("/registrations/scan", authorize("admin"), async (req, res) => {
  try {
    const tagId = String(req.body.tagId || "")
      .trim()
      .toUpperCase();

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: "tagId is required",
      });
    }

    const requestedStatus = Object.prototype.hasOwnProperty.call(
      req.body,
      "status",
    )
      ? normalizeRegistrationStatus(req.body.status)
      : undefined;

    if (requestedStatus) {
      const allowedStatuses = ["registered", "unregistered", "blocked"];
      if (!allowedStatuses.includes(requestedStatus)) {
        return res.status(400).json({
          success: false,
          error:
            "status must be active/inactive/blocked or registered/unregistered/blocked",
        });
      }
    }

    let registration = await CardRegister.findOne({
      where: { tagId },
      include: [{ model: Card }],
    });

    if (!registration) {
      const { card, cardRegister } = await registerNfcCard({
        tagId,
        tenantId: req.body.tenantId || req.user.tenantId,
        businessUrl: buildBusinessUrl(tagId),
        redirectUrl: Object.prototype.hasOwnProperty.call(
          req.body,
          "redirectUrl",
        )
          ? req.body.redirectUrl
          : undefined,
        status: requestedStatus || "registered",
        actorUserId: req.user.id,
        actorRole: req.user.role,
        actorTenantId: req.user.tenantId,
      });

      registration = cardRegister;

      if (card) {
        card.businessUrl = card.businessUrl || buildBusinessUrl(tagId);
        await card.save();
      }
    } else {
      if (requestedStatus) {
        registration.status = requestedStatus;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "redirectUrl")) {
        const nextRedirect = String(req.body.redirectUrl || "").trim();
        registration.redirectUrl = nextRedirect || null;
      }

      await registration.save();

      const existingCard =
        registration.Card || (await Card.findOne({ where: { tagId } }));
      if (existingCard) {
        existingCard.businessUrl = buildBusinessUrl(tagId);
        if (requestedStatus) {
          existingCard.isActive = requestedStatus !== "blocked";
        }
        await existingCard.save();
      }
    }

    const refreshed = await CardRegister.findOne({
      where: { tagId },
      include: [
        { model: User, attributes: ["id", "name", "email", "tenantId"] },
        { model: Tenant, attributes: ["tenantId", "name", "type"] },
        {
          model: Card,
          attributes: ["id", "tagId", "businessUrl", "publicUrl", "isActive"],
        },
      ],
    });

    const io = getIO();
    if (io) {
      io.emit("nfc_update", {
        event: "card_updated",
        tag_id: refreshed.tagId,
        status: refreshed.status,
        url: refreshed.url,
        redirect_url: refreshed.redirectUrl,
        tenant_id: refreshed.tenantId,
        user_id: refreshed.userId,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: "Card scan synchronized",
      data: refreshed,
    });
  } catch (error) {
    console.error("Error syncing card on scan:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to sync card on scan",
    });
  }
});

/**
 * POST /api/cards/import
 * Bulk import card holders from an Excel/CSV file into a tenant.
 * Common: Tag ID*, Name, Title, Email, Phone/Contact, Address, Business URL
 * SCHOOL:  Roll No (studentId), Class (grade), Section, House, Guardian (guardianName), Guardian Phone
 * HOSPITAL: Employee ID, Department, Specialization, License Number, Emergency Contact
 * BUSINESS: Company, Position/Designation, LinkedIn, Website
 */
router.post(
  "/import",
  authorize("admin", "manager"),
  (req, res, next) => {
    importUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const targetTenantId = String(req.body.tenantId || req.tenantId || "").trim();
      if (!targetTenantId) {
        return res.status(400).json({ success: false, error: "tenantId is required" });
      }

      // Parse workbook from buffer
      const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellNF: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, error: "Spreadsheet has no sheets" });
      }

      const sheet = workbook.Sheets[sheetName];
      normalizeDateCells(sheet);
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: "Spreadsheet is empty" });
      }

      // Normalise a header key for flexible matching
      // Strip ALL non-alphanumeric characters so "Roll No.", "Roll No", "RollNo", "roll_no" all match
      const norm = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      // Build a lookup from normalised header -> actual key in the row object
      const headers = Object.keys(rows[0]);
      const headerMap = {};
      headers.forEach((h) => { headerMap[norm(h)] = h; });

      const pick = (row, ...keys) => {
        for (const k of keys) {
          const real = headerMap[norm(k)];
          if (real !== undefined) {
            const val = String(row[real] ?? "").trim();
            if (val) return val;
          }
        }
        return "";
      };

      const created = [];
      const skipped = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-based, row 1 is header

        const rawTagId = pick(row, "Tag ID", "TagID", "tag_id", "tagid", "tag");

        const metadata = {
          name: pick(row, "Name", "Full Name", "fullname"),
          title: pick(row, "Title", "Position Title"),
          email: pick(row, "Email", "E-mail", "Email Address"),
          phone: pick(row, "Phone", "Phone Number", "Mobile", "Contact", "Contact No", "Phone No"),
          address: pick(row, "Address", "Full Address"),
          // SCHOOL
          studentId: pick(row, "Roll No", "Roll", "Roll Number", "Student ID", "StudentID", "Admission No"),
          grade: pick(row, "Class", "Grade", "Grade Level"),
          section: pick(row, "Section", "Class Section"),
          house: pick(row, "House"),
          guardianName: pick(row, "Guardian", "Guardian Name", "GuardianName", "Parent", "Parent Name"),
          guardianPhone: pick(row, "Guardian Phone", "GuardianPhone", "Parent Phone", "Guardian Contact"),
          // HOSPITAL
          employeeId: pick(row, "Employee ID", "EmployeeID", "Emp ID", "Staff ID"),
          department: pick(row, "Department", "Dept"),
          specialization: pick(row, "Specialization", "Speciality"),
          licenseNumber: pick(row, "License Number", "LicenseNumber", "License No"),
          emergencyContact: pick(row, "Emergency Contact", "EmergencyContact"),
          // BUSINESS
          company: pick(row, "Company", "Organization", "Organisation"),
          position: pick(row, "Position", "Job Title", "Designation"),
          linkedIn: pick(row, "LinkedIn", "Linkedin"),
          website: pick(row, "Website", "Web"),
        };

        // Remove empty metadata fields
        Object.keys(metadata).forEach((k) => { if (!metadata[k]) delete metadata[k]; });

        // Resolve tagId: use Excel value or generate new PENDING.
        // Do NOT call findExistingCardTagId during bulk import — it can match cards
        // created earlier in the same batch (e.g. two students with the same name),
        // causing those rows to silently update instead of creating new entries.
        let tagId = rawTagId
          || `PENDING-${uuidv4().toUpperCase().replace(/-/g, "").slice(0, 12)}`;

        // ── Capture any custom columns not covered by the named fields above ──
        // This allows arbitrary Excel headers (e.g. "Ronik", "Basnet", "S.N") to
        // be stored as metadata so the dynamic table discovery can display them.
        const knownNorms = new Set([
          "name","fullname","title","positiontitle","email","emailaddress",
          "phone","phonenumber","mobile","contact","contactno","phoneno",
          "address","fulladdress","rollno","roll","rollnumber","studentid",
          "admissionno","class","grade","gradelevel","section","classsection",
          "house","guardian","guardianname","parent","parentname",
          "guardianphone","parentphone","guardiancontact","employeeid","empid",
          "staffid","department","dept","specialization","speciality",
          "licensenumber","licenseno","emergencycontact","company",
          "organization","organisation","position","jobtitle","designation",
          "linkedin","website","web","tagid","tag","businessurl","url",
        ]);
        headers.forEach((h) => {
          if (knownNorms.has(norm(h))) return; // already captured above
          const val = String(row[h] ?? "").trim();
          if (!val) return;
          // Use the original header as the metadata key (preserves case and spaces)
          const key = h.trim();
          if (key && !metadata[key]) metadata[key] = val;
        });

        const businessUrl = pick(row, "Business URL", "BusinessURL", "URL", "url") || undefined;

        try {
          const { card, cardRegister } = await registerNfcCard({
            tagId,
            tenantId: targetTenantId,
            businessUrl,
            status: "registered",
            metadata,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            actorTenantId: req.user.tenantId,
          });
          created.push({ row: rowNum, tagId: card.tagId, pending: !rawTagId });
        } catch (err) {
          if (err.statusCode === 409 || /already registered/i.test(err.message || "")) {
            skipped.push({ row: rowNum, tagId, reason: "Tag ID already registered" });
          } else {
            failed.push({ row: rowNum, tagId, reason: err.message || "Unknown error" });
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: `Import complete: ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`,
        summary: { created: created.length, skipped: skipped.length, failed: failed.length },
        details: { created, skipped, failed },
      });
    } catch (error) {
      console.error("Error importing cards:", error);
      return res.status(500).json({ success: false, error: "Failed to import cards" });
    }
  },
);

// Multer config for ZIP imports (150 MB max, memory storage)
const zipImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ext === "zip") cb(null, true);
    else cb(new Error("Only .zip files are allowed"));
  },
});

/**
 * POST /api/cards/import-zip
 * Bulk import card holders from a ZIP that contains one Excel/CSV file
 * plus the profile photo files referenced in the "Photo" column.
 * Images are saved to uploads/profiles/{tenantId}/ and linked on each card.
 */
router.post(
  "/import-zip",
  authorize("admin", "manager"),
  (req, res, next) => {
    zipImportUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const targetTenantId = String(req.body.tenantId || req.tenantId || "").trim();
      if (!targetTenantId) {
        return res.status(400).json({ success: false, error: "tenantId is required" });
      }

      // Extract ZIP contents into memory
      let zip;
      try {
        zip = new AdmZip(req.file.buffer);
      } catch {
        return res.status(400).json({ success: false, error: "Invalid or corrupt ZIP file" });
      }

      const entries = zip.getEntries();

      // Separate Excel entries from image entries (ignore __MACOSX and hidden files)
      const EXCEL_EXT = /\.(xlsx|xls|csv)$/i;
      const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

      let excelEntry = null;
      const imageMap = {}; // normalised filename -> AdmZip entry

      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const base = path.basename(entry.entryName);
        if (base.startsWith(".") || entry.entryName.includes("__MACOSX")) continue;

        if (!excelEntry && EXCEL_EXT.test(base)) {
          excelEntry = entry;
        } else if (IMAGE_EXT.test(base)) {
          imageMap[base.toLowerCase()] = entry;
        }
      }

      if (!excelEntry) {
        return res.status(400).json({ success: false, error: "No Excel/CSV file found inside the ZIP" });
      }

      // Parse the spreadsheet
      const workbook = XLSX.read(excelEntry.getData(), { type: "buffer", cellNF: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, error: "Spreadsheet has no sheets" });
      }

      const sheet = workbook.Sheets[sheetName];
      normalizeDateCells(sheet);
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: "Spreadsheet is empty" });
      }

      // Ensure output directory exists
      const profilesDir = path.join(__dirname, "..", "uploads", "profiles", targetTenantId.toUpperCase());
      fs.mkdirSync(profilesDir, { recursive: true });

      const norm = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const headers = Object.keys(rows[0]);
      const headerMap = {};
      headers.forEach((h) => { headerMap[norm(h)] = h; });

      const pick = (row, ...keys) => {
        for (const k of keys) {
          const real = headerMap[norm(k)];
          if (real !== undefined) {
            const val = String(row[real] ?? "").trim();
            if (val) return val;
          }
        }
        return "";
      };

      const created = [];
      const skipped = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const rawTagId = pick(row, "Tag ID", "TagID", "tag_id", "tagid", "tag");

        // Resolve profile photo from ZIP
        const photoFilename = pick(row, "Photo", "Image", "Photo File", "Profile Photo").toLowerCase();
        let profileImageUrl = null;
        if (photoFilename && imageMap[photoFilename]) {
          const imgEntry = imageMap[photoFilename];
          const destFilename = `${uuidv4()}_${path.basename(photoFilename)}`;
          const destPath = path.join(profilesDir, destFilename);
          fs.writeFileSync(destPath, imgEntry.getData());
          profileImageUrl = `/uploads/profiles/${targetTenantId.toUpperCase()}/${destFilename}`;
        }

        const metadata = {
          name: pick(row, "Name", "Full Name", "fullname"),
          title: pick(row, "Title", "Position Title"),
          email: pick(row, "Email", "E-mail", "Email Address"),
          phone: pick(row, "Phone", "Phone Number", "Mobile", "Contact", "Contact No", "Phone No"),
          address: pick(row, "Address", "Full Address"),
          // Store original photo filename so QR exports can use it as the image name
          photo: pick(row, "Photo", "Image", "Photo File", "Profile Photo"),
          // SCHOOL
          studentId: pick(row, "Roll No", "Roll", "Roll Number", "Student ID", "StudentID", "Admission No"),
          grade: pick(row, "Class", "Grade", "Grade Level"),
          section: pick(row, "Section", "Class Section"),
          house: pick(row, "House"),
          guardianName: pick(row, "Guardian", "Guardian Name", "GuardianName", "Parent", "Parent Name"),
          guardianPhone: pick(row, "Guardian Phone", "GuardianPhone", "Parent Phone", "Guardian Contact"),
          // HOSPITAL
          employeeId: pick(row, "Employee ID", "EmployeeID", "Emp ID", "Staff ID"),
          department: pick(row, "Department", "Dept"),
          specialization: pick(row, "Specialization", "Speciality"),
          licenseNumber: pick(row, "License Number", "LicenseNumber", "License No"),
          emergencyContact: pick(row, "Emergency Contact", "EmergencyContact"),
          // BUSINESS
          company: pick(row, "Company", "Organization", "Organisation"),
          position: pick(row, "Position", "Job Title", "Designation"),
          linkedIn: pick(row, "LinkedIn", "Linkedin"),
          website: pick(row, "Website", "Web"),
        };

        Object.keys(metadata).forEach((k) => { if (!metadata[k]) delete metadata[k]; });

        // Resolve tagId: use Excel value or generate new PENDING.
        // Do NOT call findExistingCardTagId during bulk import — it can match cards
        // created earlier in the same batch (e.g. two students with the same name),
        // causing those rows to silently update instead of creating new entries.
        let tagId = rawTagId
          || `PENDING-${uuidv4().toUpperCase().replace(/-/g, "").slice(0, 12)}`;

        // ── Capture any custom columns not covered by the named fields above ──
        const knownNormsZip = new Set([
          "name","fullname","title","positiontitle","email","emailaddress",
          "phone","phonenumber","mobile","contact","contactno","phoneno",
          "address","fulladdress","rollno","roll","rollnumber","studentid",
          "admissionno","class","grade","gradelevel","section","classsection",
          "house","guardian","guardianname","parent","parentname",
          "guardianphone","parentphone","guardiancontact","employeeid","empid",
          "staffid","department","dept","specialization","speciality",
          "licensenumber","licenseno","emergencycontact","company",
          "organization","organisation","position","jobtitle","designation",
          "linkedin","website","web","tagid","tag","businessurl","url",
          "photo","image","photofile","profilephoto",
        ]);
        headers.forEach((h) => {
          if (knownNormsZip.has(norm(h))) return;
          const val = String(row[h] ?? "").trim();
          if (!val) return;
          const key = h.trim();
          if (key && !metadata[key]) metadata[key] = val;
        });

        const businessUrl = pick(row, "Business URL", "BusinessURL", "URL", "url") || undefined;

        try {
          const { card } = await registerNfcCard({
            tagId,
            tenantId: targetTenantId,
            businessUrl,
            status: "registered",
            metadata,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            actorTenantId: req.user.tenantId,
          });

          if (profileImageUrl) {
            await card.update({ profileImageUrl });
          }

          created.push({ row: rowNum, tagId: card.tagId, pending: !rawTagId, hasPhoto: !!profileImageUrl });
        } catch (err) {
          // Clean up the written profile image — the card record was not created
          if (profileImageUrl) deleteProfileImage(profileImageUrl);

          if (err.statusCode === 409 || /already registered/i.test(err.message || "")) {
            skipped.push({ row: rowNum, tagId, reason: "Tag ID already registered" });
          } else {
            failed.push({ row: rowNum, tagId, reason: err.message || "Unknown error" });
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: `Import complete: ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`,
        summary: { created: created.length, skipped: skipped.length, failed: failed.length },
        details: { created, skipped, failed },
      });
    } catch (error) {
      console.error("Error importing ZIP:", error);
      return res.status(500).json({ success: false, error: "Failed to import ZIP" });
    }
  },
);

/**
 * GET /api/cards/:tagId
 * Get a specific card by tag ID
 */
router.get("/:tagId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: {
        tenantId: req.tenantId,
        tagId: req.params.tagId.toUpperCase(),
      },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Card not found",
      });
    }

    res.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch card",
    });
  }
});

/**
 * POST /api/cards
 * Register a new NFC card
 */
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { tagId, tenantId, businessUrl, redirectUrl, status, metadata } =
      req.body;

    const { card, cardRegister, shortCode } = await registerNfcCard({
      tagId,
      tenantId: tenantId || req.tenantId,
      businessUrl,
      redirectUrl,
      status,
      metadata,
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorTenantId: req.user.tenantId,
    });

    res.status(201).json({
      success: true,
      message: "Card registered successfully",
      data: {
        card,
        registration: cardRegister,
      },
      status: cardRegister.status,
      url: shortCode,
      tag_id: cardRegister.tagId,
      redirect_url: cardRegister.redirectUrl,
      tenant_id: cardRegister.tenantId,
      user_id: cardRegister.userId,
    });
  } catch (error) {
    console.error("Error creating card:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to register card",
    });
  }
});

/**
 * PUT /api/cards/:tagId
 * Update an existing card
 */
router.put("/:tagId", async (req, res) => {
  try {
    const { businessUrl, metadata, isActive } = req.body;

    const card = await Card.findOne({
      where: {
        tenantId: req.tenantId,
        tagId: req.params.tagId.toUpperCase(),
      },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Card not found",
      });
    }

    // Update fields
    if (businessUrl) card.businessUrl = businessUrl;
    if (metadata) {
      const existing = card.metadata;
      const existingObj = typeof existing === 'string'
        ? (() => { try { return JSON.parse(existing); } catch { return {}; } })()
        : (existing || {});
      card.metadata = { ...existingObj, ...metadata };
    }
    if (typeof isActive !== "undefined") card.isActive = isActive;

    await card.save();

    res.json({
      success: true,
      message: "Card updated successfully",
      data: card,
    });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update card",
    });
  }
});

/**
 * DELETE /api/cards/bulk
 * Permanently delete multiple cards by tagId and remove their profile images
 */
router.delete("/bulk", async (req, res) => {
  try {
    const tagIds = req.body.tagIds;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "tagIds must be a non-empty array",
      });
    }

    const normalizedTagIds = tagIds.map((id) =>
      String(id || "").trim().toUpperCase()
    ).filter(Boolean);

    if (normalizedTagIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "tagIds must contain valid tag IDs",
      });
    }

    const cards = await Card.findAll({
      where: {
        tenantId: req.tenantId,
        tagId: { [Op.in]: normalizedTagIds },
      },
    });

    // Delete physical files before destroying records
    cards.forEach((card) => deleteProfileImage(card.profileImageUrl));

    const count = await Card.destroy({
      where: {
        tenantId: req.tenantId,
        tagId: { [Op.in]: normalizedTagIds },
      },
    });

    res.json({
      success: true,
      message: `${count} card(s) deleted successfully`,
      deleted: count,
    });
  } catch (error) {
    console.error("Error bulk deleting cards:", error);
    res.status(500).json({
      success: false,
      error: "Failed to bulk delete cards",
    });
  }
});

/**
 * DELETE /api/cards/:tagId
 * Permanently delete a card and remove its profile image
 */
router.delete("/:tagId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: {
        tenantId: req.tenantId,
        tagId: req.params.tagId.toUpperCase(),
      },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Card not found",
      });
    }

    deleteProfileImage(card.profileImageUrl);
    await card.destroy();

    res.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete card",
    });
  }
});

// Multer config for QR bulk update ZIP (150 MB max, memory storage)
const qrBulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ext === "zip") cb(null, true);
    else cb(new Error("Only .zip files are allowed"));
  },
});

/**
 * POST /api/cards/bulk-update-qr
 * Update QR images for existing card holders in bulk.
 * Accepts a ZIP containing:
 *   - One Excel/CSV spreadsheet with a "QR" column (QR image filename)
 *     plus an identifier column (Roll No / Name / etc.)
 *   - The QR image files referenced in the "QR" column
 * Matches each row to an existing card by Roll No / Student ID / Name
 * and stores the QR image URL in metadata.qrImageUrl on the matched card.
 */
router.post(
  "/bulk-update-qr",
  authorize("admin", "manager"),
  (req, res, next) => {
    qrBulkUpload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const targetTenantId = String(req.body.tenantId || req.tenantId || "").trim().toUpperCase();
      if (!targetTenantId) {
        return res.status(400).json({ success: false, error: "tenantId is required" });
      }

      // Extract ZIP
      let zip;
      try {
        zip = new AdmZip(req.file.buffer);
      } catch {
        return res.status(400).json({ success: false, error: "Invalid or corrupt ZIP file" });
      }

      const entries = zip.getEntries();
      const EXCEL_EXT = /\.(xlsx|xls|csv)$/i;
      const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

      let excelEntry = null;
      const imageMap = {}; // normalised filename -> AdmZip entry

      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const base = path.basename(entry.entryName);
        if (base.startsWith(".") || entry.entryName.includes("__MACOSX")) continue;

        if (!excelEntry && EXCEL_EXT.test(base)) {
          excelEntry = entry;
        } else if (IMAGE_EXT.test(base)) {
          imageMap[base.toLowerCase()] = entry;
        }
      }

      if (!excelEntry) {
        return res.status(400).json({ success: false, error: "No Excel/CSV file found inside the ZIP" });
      }

      if (Object.keys(imageMap).length === 0) {
        return res.status(400).json({ success: false, error: "No QR image files found inside the ZIP" });
      }

      // Parse spreadsheet
      const workbook = XLSX.read(excelEntry.getData(), { type: "buffer", cellNF: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, error: "Spreadsheet has no sheets" });
      }

      const sheet = workbook.Sheets[sheetName];
      normalizeDateCells(sheet);
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: "Spreadsheet is empty" });
      }

      const headers = Object.keys(rows[0]);
      const headerMap = {};
      const normKey = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      headers.forEach((h) => { headerMap[normKey(h)] = h; });

      const pick = (row, ...keys) => {
        for (const k of keys) {
          const real = headerMap[normKey(k)];
          if (real !== undefined) {
            const val = String(row[real] ?? "").trim();
            if (val) return val;
          }
        }
        return "";
      };

      // Fetch all cards for this tenant once
      const allCards = await Card.findAll({ where: { tenantId: targetTenantId } });
      if (allCards.length === 0) {
        return res.status(404).json({ success: false, error: "No cards found for this tenant" });
      }

      // Build lookup indexes for fast matching
      const cardByStudentId = new Map(); // rollNo / studentId -> card
      const cardByName = new Map();      // lowercase name -> card

      for (const card of allCards) {
        const meta = card.metadata || {};
        if (meta.studentId) cardByStudentId.set(String(meta.studentId).toLowerCase(), card);
        if (meta.employeeId) cardByStudentId.set(String(meta.employeeId).toLowerCase(), card);
        if (meta.name) cardByName.set(String(meta.name).toLowerCase(), card);
      }

      // Ensure QR output directory exists
      const qrDir = path.join(__dirname, "..", "uploads", "qr", targetTenantId);
      fs.mkdirSync(qrDir, { recursive: true });

      const updated = [];
      const skipped = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        // Get QR image filename from "QR" column
        const qrFilename = pick(row, "QR", "QR Code", "QR Image", "QRCode", "QR File").toLowerCase();
        if (!qrFilename) {
          skipped.push({ row: rowNum, reason: "No QR column value" });
          continue;
        }

        if (!imageMap[qrFilename]) {
          skipped.push({ row: rowNum, qrFilename, reason: "QR image not found in ZIP" });
          continue;
        }

        // Find matching card: Roll No → Student ID / Employee ID → Name
        const rollNo = pick(row, "Roll No", "Roll", "Roll Number", "Student ID", "StudentID", "Employee ID", "Roll no");
        const name = pick(row, "Student Name", "Name", "Full Name");

        let card = null;
        if (rollNo) card = cardByStudentId.get(rollNo.toLowerCase()) || null;
        if (!card && name) card = cardByName.get(name.toLowerCase()) || null;

        if (!card) {
          skipped.push({ row: rowNum, qrFilename, identifier: rollNo || name || "(none)", reason: "No matching card found" });
          continue;
        }

        // Save QR image to disk
        const safeName = path.basename(qrFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
        const destFilename = `${uuidv4()}_${safeName}`;
        const destPath = path.join(qrDir, destFilename);

        try {
          const imgBuffer = imageMap[qrFilename].getData();
          if (!imgBuffer || imgBuffer.length === 0) throw new Error("Empty image data");
          fs.writeFileSync(destPath, imgBuffer);
        } catch (writeErr) {
          failed.push({ row: rowNum, qrFilename, reason: `Failed to save image: ${writeErr.message}` });
          continue;
        }

        const qrImageUrl = `/uploads/qr/${targetTenantId}/${destFilename}`;

        // Delete old QR image if one exists for this card
        const oldQrUrl = (card.metadata || {}).qrImageUrl;
        if (oldQrUrl) {
          try {
            const oldPath = path.join(__dirname, "..", oldQrUrl);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } catch { /* ignore cleanup errors */ }
        }

        try {
          await card.update({ metadata: { ...card.metadata, qrImageUrl } });
          updated.push({ row: rowNum, tagId: card.tagId, qrImageUrl });
        } catch (dbErr) {
          // Roll back the written file on DB failure
          try { fs.unlinkSync(destPath); } catch {}
          failed.push({ row: rowNum, qrFilename, reason: `DB update failed: ${dbErr.message}` });
        }
      }

      return res.json({
        success: true,
        message: `QR update complete: ${updated.length} updated, ${skipped.length} skipped, ${failed.length} failed`,
        summary: { updated: updated.length, skipped: skipped.length, failed: failed.length },
        details: { updated, skipped, failed },
      });
    } catch (error) {
      console.error("Error in bulk QR update:", error);
      return res.status(500).json({ success: false, error: "Failed to bulk update QR codes" });
    }
  },
);

/**
 * GET /api/cards/:tagId/analytics
 * Get tap analytics for a specific card
 */
router.get("/:tagId/analytics", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: {
        tenantId: req.tenantId,
        tagId: req.params.tagId.toUpperCase(),
      },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: "Card not found",
      });
    }

    res.json({
      success: true,
      data: {
        tagId: card.tagId,
        tapCount: card.tapCount,
        lastTapped: card.lastTapped,
        createdAt: card.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
});

module.exports = router;
