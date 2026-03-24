const express = require("express");
const router = express.Router();
const { Card, CardRegister, User, Tenant } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { Op } = require("sequelize");
const { registerNfcCard } = require("../utils/nfcRegistration");
const { getIO } = require("../utils/socket");
const multer = require("multer");
const XLSX = require("xlsx");

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

function buildBusinessUrl(tagId) {
  const base = (
    process.env.TAG_WRITE_BASE_URL ||
    `${(process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "")}/card`
  ).replace(/\/$/, "");
  return `${base}/${encodeURIComponent(tagId)}`;
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
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, error: "Spreadsheet has no sheets" });
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: "Spreadsheet is empty" });
      }

      // Normalise a header key for flexible matching
      const norm = (v) => String(v || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

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

        const tagId = pick(row, "Tag ID", "TagID", "tag_id", "tagid", "tag");
        if (!tagId) {
          skipped.push({ row: rowNum, reason: "Missing Tag ID" });
          continue;
        }

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
          created.push({ row: rowNum, tagId: card.tagId });
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
 * DELETE /api/cards/:tagId
 * Delete a card (soft delete by setting isActive to false)
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

    card.isActive = false;
    await card.save();

    res.json({
      success: true,
      message: "Card deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete card",
    });
  }
});

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
