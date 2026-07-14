const express = require("express");
const router = express.Router();
const { Card, Tenant, CardRegister, User, CardTemplate } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { registerNfcCard } = require("../utils/nfcRegistration");
const { Op } = require("sequelize");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const photoZipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".zip")) cb(null, true);
    else cb(new Error("Only .zip files are allowed"));
  },
});

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

/** Generates a human-readable one-time password */
function generateOTP() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "#@!";
  const all = upper + lower + digits + special;
  const rand = (set) => set[crypto.randomInt(0, set.length)];
  const rest = Array.from({ length: 5 }, () => rand(all)).join("");
  return rand(upper) + rand(digits) + rand(special) + rand(lower) + rest;
}

// All routes require authentication and admin or manager role
router.use(protect, authorize("admin", "manager"));

/**
 * Returns a 403 response if the current manager does not own the given tenant.
 * Admins always pass. Returns true if access is denied (response already sent).
 */
const denyIfNotOwner = (req, res, tenant) => {
  if (req.user.role === "admin") return false;
  if (tenant.createdBy !== req.user.id) {
    res.status(403).json({
      success: false,
      error: "Access denied: you do not own this organization",
    });
    return true;
  }
  return false;
};

/**
 * GET /api/manager/organizations
 * List organizations. Managers only see their own; admins see all.
 */
router.get("/organizations", async (req, res) => {
  try {
    const where = req.user.role === "manager" ? { createdBy: req.user.id } : {};
    const includeCreator = req.user.role === "admin"
      ? [{ model: User, as: "creator", attributes: ["id", "name", "email"] }]
      : [];
    const tenants = await Tenant.findAll({
      where,
      include: includeCreator,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, count: tenants.length, data: tenants });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch organizations" });
  }
});

/**
 * POST /api/manager/organizations
 * Create a new organization
 */
router.post("/organizations", async (req, res) => {
  try {
    const { tenantId, name, type, contactEmail, logoUrl } = req.body;

    if (!tenantId || !name || !type || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: "tenantId, name, type, and contactEmail are required",
      });
    }

    const existing = await Tenant.findOne({
      where: { tenantId: tenantId.toUpperCase() },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Organization ID already exists" });
    }

    const tenant = await Tenant.create({
      tenantId: tenantId.toUpperCase(),
      name,
      type,
      contactEmail,
      logoUrl: logoUrl || null,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: tenant,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create organization" });
  }
});

/**
 * PUT /api/manager/organizations/:tenantId
 * Update an organization
 */
router.put("/organizations/:tenantId", async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      where: { tenantId: req.params.tenantId.toUpperCase() },
    });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const { name, type, contactEmail, logoUrl, isActive } = req.body;
    if (name) tenant.name = name;
    if (type) tenant.type = type;
    if (contactEmail) tenant.contactEmail = contactEmail;
    if (logoUrl !== undefined) tenant.logoUrl = logoUrl;
    if (typeof isActive !== "undefined") tenant.isActive = isActive;

    await tenant.save();
    res.json({
      success: true,
      message: "Organization updated successfully",
      data: tenant,
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update organization" });
  }
});

/**
 * DELETE /api/manager/organizations/:tenantId
 * Deactivate an organization (admin only)
 */
router.delete(
  "/organizations/:tenantId",
  authorize("admin"),
  async (req, res) => {
    try {
      const tenant = await Tenant.findOne({
        where: { tenantId: req.params.tenantId.toUpperCase() },
      });
      if (!tenant) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      tenant.isActive = false;
      await tenant.save();
      res.json({
        success: true,
        message: "Organization deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating organization:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to deactivate organization" });
    }
  },
);

/**
 * GET /api/manager/organizations/:tenantId/cards
 * List all card holders in an organization
 */
router.get("/organizations/:tenantId/cards", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const [cards, templates] = await Promise.all([
      Card.findAll({ where: { tenantId }, order: [["createdAt", "DESC"]] }),
      CardTemplate.findAll({ where: { tenantId }, order: [["isDefault", "DESC"], ["createdAt", "ASC"]] }),
    ]);

    res.json({ success: true, count: cards.length, data: cards, tenant, templates });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch card holders" });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/cards/:tagId
 * Get a specific card holder by tag ID within an organization
 */
router.get("/organizations/:tenantId/cards/:tagId", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tagId = req.params.tagId.toUpperCase();

    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const card = await Card.findOne({
      where: { tenantId, tagId },
    });
    if (!card) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    // Include template fields if card was created from a template
    let templateFields = null;
    const templateId = card.metadata?.__templateId;
    if (templateId) {
      try {
        const tpl = await CardTemplate.findOne({
          where: { id: templateId, tenantId },
          attributes: ["id", "name", "fields"],
        });
        if (tpl) templateFields = tpl.fields;
      } catch { /* non-fatal */ }
    }

    res.json({ success: true, data: card, tenant, templateFields });
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card" });
  }
});

/**
 * POST /api/manager/organizations/:tenantId/cards
 * Add a new card holder to an organization
 */

router.post(
  "/organizations/:tenantId/cards",
  authorize("manager"),
  async (req, res) => {
    try {
      const tenantId = req.params.tenantId.toUpperCase();

      // 1. Validate tenant
      const tenant = await Tenant.findOne({
        where: { tenantId, isActive: true },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: "Organization not found or inactive",
        });
      }

      // 2. Extract body
      const { tagId: rawTagId, profileImageUrl, metadata, businessUrl } = req.body;

      // tagId is optional — generate a PENDING placeholder when not provided
      const tagIdUpper = rawTagId
        ? rawTagId.toUpperCase()
        : `PENDING-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

      const isPending = tagIdUpper.startsWith("PENDING-");

      let tag = null;

      if (!isPending) {
        // 3. Check CardRegister — must exist and belong to this organization (or be unassigned)
        tag = await CardRegister.findOne({
          where: {
            tagId: tagIdUpper,
            status: "registered",
            [Op.or]: [{ tenantId: null }, { tenantId: tenantId }],
          },
        });

        if (!tag) {
          return res.status(403).json({
            success: false,
            error: "Card not registered for this organization. Please contact administration.",
          });
        }

        // 4. Prevent duplicate assignment — only block if a card holder name is already set
        const existingCard = await Card.findOne({ where: { tagId: tagIdUpper } });
        if (existingCard && existingCard.metadata && existingCard.metadata.name) {
          return res.status(400).json({
            success: false,
            error: "This card is already assigned to a user.",
          });
        }
      }

      // 5. Create or update the card
      const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3030").replace(/\/$/, "");
      let card;

      if (isPending) {
        // No physical tag yet — create a new card with PENDING placeholder
        card = await Card.create({
          tagId: tagIdUpper,
          tenantId,
          businessUrl: businessUrl || `${frontendBase}/view/${encodeURIComponent(tagIdUpper)}`,
          publicUrl: `${frontendBase}/view/${encodeURIComponent(tagIdUpper)}`,
          metadata: { ...(metadata || {}) },
        });
      } else {
        const existingCard = await Card.findOne({ where: { tagId: tagIdUpper } });
        if (existingCard) {
          existingCard.tenantId = tenantId;
          existingCard.metadata = { ...(existingCard.metadata || {}), ...(metadata || {}) };
          if (businessUrl) existingCard.businessUrl = businessUrl;
          if (!existingCard.publicUrl) {
            existingCard.publicUrl = `${frontendBase}/view/${encodeURIComponent(tagIdUpper)}`;
          }
          await existingCard.save();
          card = existingCard;
        } else {
          const result = await registerNfcCard({
            tagId: tagIdUpper,
            tenantId,
            businessUrl,
            metadata: { ...(metadata || {}) },
            actorUserId: req.user.id,
            actorRole: req.user.role,
            actorTenantId: req.user.tenantId,
          });
          card = result.card;
        }
      }

      // 6. Optional profile image
      if (profileImageUrl) {
        card.profileImageUrl = profileImageUrl;
        await card.save();
      }

      // 7. Update CardRegister (only when a real tag was selected)
      if (tag) {
        tag.redirectUrl = card.publicUrl;
        tag.userId = req.user.id;
        tag.tenantId = tenantId;
        tag.cardId = card.id;
        await tag.save();
      }

      // 8. Response
      return res.status(201).json({
        success: true,
        message: "Card holder added successfully",
        data: {
          id: card.id,
          tagId: card.tagId,
          tenantId: card.tenantId,
          publicUrl: card.publicUrl,
          profileImageUrl: card.profileImageUrl,
        },
        url: tag ? tag.url : null,
        tag_id: card.tagId,
        redirect_url: card.publicUrl,
      });
    } catch (error) {
      console.error("Error adding card holder:", error);

      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Failed to add card holder",
      });
    }
  },
);
/**
 * PUT /api/manager/organizations/:tenantId/cards/bulk-design
 * Apply card design settings to multiple card holders at once.
 * NOTE: must be registered BEFORE PUT /cards/:cardId to prevent Express treating
 * the literal string "bulk-design" as a :cardId parameter.
 */
router.put("/organizations/:tenantId/cards/bulk-design", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const { cardIds, designSettings } = req.body;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: "cardIds must be a non-empty array" });
    }
    if (!designSettings || typeof designSettings !== "object" || Array.isArray(designSettings)) {
      return res.status(400).json({ success: false, error: "designSettings must be an object" });
    }

    const ALLOWED_KEYS = ["design", "preset", "primaryColor", "secondaryColor", "accentColor", "surfaceColor", "textColor", "nameTextColor", "valueTextColor", "fontFamily", "isDark", "contrast", "hiddenFields", "layout"];
    const sanitized = {};
    for (const key of ALLOWED_KEYS) {
      if (key in designSettings) sanitized[key] = designSettings[key];
    }

    const cards = await Card.findAll({ where: { id: cardIds, tenantId } });
    if (cards.length === 0) {
      return res.status(404).json({ success: false, error: "No matching cards found" });
    }

    for (const card of cards) {
      const existing =
        typeof card.metadata === "string"
          ? (() => { try { return JSON.parse(card.metadata); } catch { return {}; } })()
          : card.metadata || {};
      card.metadata = { ...existing, _design: sanitized };
      await card.save();
    }

    res.json({ success: true, message: `Design applied to ${cards.length} card(s)`, count: cards.length });
  } catch (error) {
    console.error("Error applying bulk design:", error);
    res.status(500).json({ success: false, error: "Failed to apply bulk design" });
  }
});

/**
 * DELETE /api/manager/organizations/:tenantId/cards/bulk
 * Remove multiple card holders from an organization at once.
 */
router.delete("/organizations/:tenantId/cards/bulk", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const { cardIds } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: "cardIds must be a non-empty array" });
    }

    const normalizedCardIds = cardIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    if (normalizedCardIds.length === 0) {
      return res.status(400).json({ success: false, error: "cardIds must contain valid card IDs" });
    }

    const cards = await Card.findAll({ where: { tenantId, id: { [Op.in]: normalizedCardIds } } });
    cards.forEach((card) => deleteProfileImage(card.profileImageUrl));

    const deletedCount = await Card.destroy({
      where: {
        tenantId,
        id: { [Op.in]: normalizedCardIds },
      },
    });

    res.json({
      success: true,
      message: `${deletedCount} card holder(s) removed successfully`,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error("Error bulk removing card holders:", error);
    res.status(500).json({ success: false, error: "Failed to remove card holders" });
  }
});

/**
 * PUT /api/manager/organizations/:tenantId/cards/:cardId
 * Update a card holder
 */
router.put("/organizations/:tenantId/cards/:cardId", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId },
    });
    if (!card) {
      return res
        .status(404)
        .json({ success: false, error: "Card holder not found" });
    }

    const { profileImageUrl, metadata, isActive } = req.body;
    if (profileImageUrl !== undefined) card.profileImageUrl = profileImageUrl;
    if (metadata) {
      const existing = card.metadata;
      const existingObj =
        typeof existing === "string"
          ? (() => { try { return JSON.parse(existing); } catch { return {}; } })()
          : (existing || {});
      card.metadata = { ...existingObj, ...metadata };
    }
    if (typeof isActive !== "undefined") card.isActive = isActive;

    // Backfill publicUrl for cards created before the column was added
    if (!card.publicUrl) {
      const frontendBase = (
        process.env.FRONTEND_URL || "http://localhost:3030"
      ).replace(/\/$/, "");
      card.publicUrl = `${frontendBase}/view/${encodeURIComponent(card.tagId)}`;
    }

    await card.save();
    res.json({
      success: true,
      message: "Card holder updated successfully",
      data: card,
    });
  } catch (error) {
    console.error("Error updating card holder:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update card holder" });
  }
});

/**
 * DELETE /api/manager/organizations/:tenantId/cards/:cardId
 * Remove a card holder from an organization
 */
router.delete("/organizations/:tenantId/cards/:cardId", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId },
    });
    if (!card) {
      return res
        .status(404)
        .json({ success: false, error: "Card holder not found" });
    }

    deleteProfileImage(card.profileImageUrl);
    await card.destroy();
    res.json({ success: true, message: "Card holder removed successfully" });
  } catch (error) {
    console.error("Error removing card holder:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to remove card holder" });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/nfc-tags
 * Return registered NFC tags for this tenant that are not yet assigned to a card holder
 */
router.get("/organizations/:tenantId/nfc-tags", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    // Registered tags that belong to THIS organization
    const registrations = await CardRegister.findAll({
      where: { status: "registered", tenantId },
      attributes: ["tagId", "url", "redirectUrl", "tenantId"],
      order: [["createdAt", "DESC"]],
    });

    // Tags already assigned to a card holder (have a name in metadata)
    const assignedCards = await Card.findAll({
      where: { tenantId },
      attributes: ["tagId", "metadata"],
    });
    const assignedSet = new Set(
      assignedCards
        .filter((c) => c.metadata && c.metadata.name)
        .map((c) => c.tagId.toUpperCase())
    );

    const available = registrations.filter(
      (r) => !assignedSet.has(r.tagId.toUpperCase()) && !r.tagId.toUpperCase().startsWith("PENDING-")
    );

    res.json({ success: true, data: available });
  } catch (error) {
    console.error("Error fetching NFC tags:", error);
    res.status(500).json({ success: false, error: "Failed to fetch NFC tags" });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/export
 * Get all card data for export (used by frontend for ZIP generation)
 */
router.get("/organizations/:tenantId/export", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const cards = await Card.findAll({
      where: { tenantId, isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        organization: tenant,
        cards,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching export data:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch export data" });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/tenant-account
 * Check if a tenant login account exists for this organization
 */
router.get("/organizations/:tenantId/tenant-account", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const account = await User.findOne({
      where: { tenantId, role: "tenant" },
      attributes: ["id", "name", "email", "isActive", "mustChangePassword", "createdAt"],
    });

    res.json({ success: true, data: account || null });
  } catch (error) {
    console.error("Error fetching tenant account:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tenant account" });
  }
});

/**
 * POST /api/manager/organizations/:tenantId/tenant-account
 * Create a tenant login account for the organization with a generated password.
 */
router.post("/organizations/:tenantId/tenant-account", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId, isActive: true } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found or inactive" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    // One tenant account per organization
    const existing = await User.findOne({ where: { tenantId, role: "tenant" } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "A tenant login account already exists for this organization. Use reset instead.",
      });
    }

    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "name and email are required" });
    }

    const emailInUse = await User.findOne({ where: { email } });
    if (emailInUse) {
      return res.status(409).json({ success: false, error: "Email is already in use" });
    }

    const password = generateOTP();

    const user = await User.create({
      name,
      email,
      password,
      tenantId,
      role: "tenant",
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message: "Tenant account created. Share the generated password with the organization.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        generatedPassword: password,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error("Error creating tenant account:", error);
    res.status(500).json({ success: false, error: "Failed to create tenant account" });
  }
});

/**
 * POST /api/manager/organizations/:tenantId/reset-credentials
 * Reset the tenant login password — generates a new one-time password.
 * Manager must own the org; admins can reset any.
 */
router.post("/organizations/:tenantId/reset-credentials", async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    const account = await User.findOne({ where: { tenantId, role: "tenant" } });
    if (!account) {
      return res.status(404).json({
        success: false,
        error: "No tenant login account found. Create one first.",
      });
    }

    const newPassword = generateOTP();
    account.password = newPassword;     // model hook will hash it
    account.mustChangePassword = true;
    account.isActive = true;             // re-activate if it was deactivated
    await account.save();

    res.json({
      success: true,
      message: "Password reset successfully. Share the new password with the organization.",
      data: {
        id: account.id,
        name: account.name,
        email: account.email,
        generatedPassword: newPassword,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error("Error resetting credentials:", error);
    res.status(500).json({ success: false, error: "Failed to reset credentials" });
  }
});

// POST /api/manager/organizations/:tenantId/upload-photos
// Upload a ZIP of photos only and link them to existing card holders
// by matching each image filename (case-insensitive) against metadata.photo
router.post(
  "/organizations/:tenantId/upload-photos",
  protect,
  authorize("manager", "admin"),
  (req, res, next) => {
    photoZipUpload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || "File upload rejected",
        });
      }
      next();
    });
  },
  async (req, res) => {
    const tenantId = req.params.tenantId.toUpperCase();

    // Look up the tenant so denyIfNotOwner receives the full object
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: "Organization not found" });
    }
    if (denyIfNotOwner(req, res, tenant)) return;

    if (!req.file) {
      return res.status(400).json({ error: "No ZIP file provided" });
    }

    const IMAGE_EXTS = new Set([
      "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "heic", "avif",
    ]);

    let zip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch {
      return res.status(400).json({ error: "Invalid or corrupt ZIP file" });
    }

    // Build a map: normalised filename (lowercase) → zip entry
    // Skip __MACOSX artefacts and hidden dot-files that end up in some ZIPs
    const imageMap = {};
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (entry.entryName.startsWith("__MACOSX") || entry.entryName.startsWith(".")) continue;
      const entryName = path.basename(entry.entryName);
      if (!entryName || entryName.startsWith(".")) continue;
      const ext = entryName.split(".").pop().toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      imageMap[entryName.toLowerCase()] = { entry, originalName: entryName };
    }

    if (Object.keys(imageMap).length === 0) {
      return res
        .status(400)
        .json({ error: "No supported image files found in ZIP" });
    }

    // Fetch all cards for this tenant
    let cards;
    try {
      cards = await Card.findAll({ where: { tenantId } });
    } catch (dbErr) {
      console.error("DB error fetching cards:", dbErr);
      return res.status(500).json({ error: "Failed to load card records" });
    }

    if (cards.length === 0) {
      return res.status(404).json({ error: "No card holders found for this organization" });
    }

    // ── Build lookup maps ──────────────────────────────────────────────────────
    // qrMap  — matches by meta.qr ONLY (exact filename + stem, no ID fallback).
    //          This avoids ambiguity with the photo map when stems overlap.
    // photoMap — matches by meta.photo, ID fields, tagId, profileImageUrl stem.
    //
    // For each image in the ZIP we check qrMap FIRST (exact), then photoMap
    // (exact), then try stems in the same priority order.  An image is saved
    // as a QR image OR a profile photo — never both.  However a card CAN have
    // BOTH updated in one batch (photo via one image, QR via another).

    const ID_FIELDS_PH = ["studentId", "rollNo", "admissionNo", "employeeId", "staffId"];

    // ── QR map (meta.qr exact + stem) ─────────────────────────────────────────
    const qrLookup = new Map(); // lowercase key → card
    for (const card of cards) {
      const qr = (card.metadata || {}).qr;
      if (!qr) continue;
      const k = qr.toLowerCase();
      if (!qrLookup.has(k)) qrLookup.set(k, card);
      const stem = k.replace(/\.[^.]+$/, "");
      if (stem && !qrLookup.has(stem)) qrLookup.set(stem, card);
    }

    // ── Photo map (meta.photo + ID fields + tagId + profileImageUrl stem) ──────
    function buildPhotoMap(cardList) {
      const map = new Map();
      function addKey(k, card) {
        if (!k) return;
        const lk = String(k).toLowerCase();
        if (!map.has(lk)) map.set(lk, card);
        const asInt = parseInt(lk, 10);
        if (!isNaN(asInt) && String(asInt) !== lk && !map.has(String(asInt))) {
          map.set(String(asInt), card);
        }
      }
      for (const card of cardList) {
        const meta = card.metadata || {};
        if (meta.photo) {
          const pk = meta.photo.toLowerCase();
          addKey(pk, card);
          addKey(pk.replace(/\.[^.]+$/, ""), card);
        }
        for (const f of ID_FIELDS_PH) {
          if (meta[f]) addKey(String(meta[f]).trim(), card);
        }
        if (card.tagId && !card.tagId.toUpperCase().startsWith("PENDING-")) addKey(card.tagId, card);
        if (card.profileImageUrl) {
          const stored = path.basename(card.profileImageUrl);
          if (stored.length > 37 && stored[36] === "_") {
            const bn = stored.slice(37);
            addKey(bn, card);
            addKey(bn.replace(/\.[^.]+$/, ""), card);
          }
        }
      }
      return map;
    }
    const photoLookup = buildPhotoMap(cards);

    console.log(`[upload-photos] qrLookup: ${qrLookup.size} keys, photoLookup: ${photoLookup.size} keys`);
    cards.slice(0, 3).forEach(c => {
      const m = c.metadata || {};
      console.log(`[upload-photos] Card ${c.id}: photo=${m.photo}, qr=${m.qr}, studentId=${m.studentId}`);
    });

    // ── Helper: classify each image as 'qr' | 'photo' | null ──────────────────
    // Check QR exact → photo exact → QR stem → photo stem → int stem
    function classifyImage(imageKey) {
      if (qrLookup.has(imageKey)) return { type: "qr",   card: qrLookup.get(imageKey) };
      if (photoLookup.has(imageKey)) return { type: "photo", card: photoLookup.get(imageKey) };
      const stem = imageKey.replace(/\.[^.]+$/, "");
      if (qrLookup.has(stem))    return { type: "qr",   card: qrLookup.get(stem) };
      if (photoLookup.has(stem)) return { type: "photo", card: photoLookup.get(stem) };
      const asInt = parseInt(stem, 10);
      if (!isNaN(asInt)) {
        const intStem = String(asInt);
        if (qrLookup.has(intStem))    return { type: "qr",   card: qrLookup.get(intStem) };
        if (photoLookup.has(intStem)) return { type: "photo", card: photoLookup.get(intStem) };
      }
      return null;
    }

    // ── Validation pass ────────────────────────────────────────────────────────
    const skipUnmatched = req.body.skipUnmatched === true ||
      req.body.skipUnmatched === "true" ||
      req.query.skipUnmatched === "true";

    const unmatchedImages = [];
    for (const key of Object.keys(imageMap)) {
      const match = classifyImage(key);
      if (!match) {
        unmatchedImages.push(imageMap[key].originalName);
        console.log(`[upload-photos] No match for image: ${key}`);
      } else {
        console.log(`[upload-photos] Matched ${key} → card ${match.card.id} as ${match.type}`);
      }
    }

    if (unmatchedImages.length > 0 && !skipUnmatched) {
      return res.status(422).json({
        error: "Upload rejected: some images have no matching card holder",
        unmatched: unmatchedImages,
      });
    }

    for (const name of unmatchedImages) {
      delete imageMap[name.toLowerCase()];
    }

    // ── Ensure output directories exist ───────────────────────────────────────
    const profilesDir = path.join(__dirname, "..", "uploads", "profiles", tenantId);
    const qrDir       = path.join(__dirname, "..", "uploads", "qr",       tenantId);
    try {
      fs.mkdirSync(profilesDir, { recursive: true });
      fs.mkdirSync(qrDir,       { recursive: true });
    } catch (mkdirErr) {
      console.error("Could not create output directories:", mkdirErr);
      return res.status(500).json({ error: "Server storage error" });
    }

    let linkedPhotos = 0;
    let linkedQr     = 0;
    let skipped      = 0;
    const writeErrors = [];
    const updatedPhotoIds = new Set(); // card IDs whose photo was updated this batch
    const updatedQrIds    = new Set(); // card IDs whose QR was updated this batch

    for (const [key, { entry, originalName }] of Object.entries(imageMap)) {
      const match = classifyImage(key);
      if (!match) { skipped++; continue; }

      const { type, card } = match;

      // Skip if this card already had this type updated in this batch
      if (type === "photo" && updatedPhotoIds.has(card.id)) { skipped++; continue; }
      if (type === "qr"    && updatedQrIds.has(card.id))    { skipped++; continue; }

      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${uuidv4()}_${safeName}`;
      const destDir  = type === "qr" ? qrDir : profilesDir;
      const destPath = path.join(destDir, filename);

      let imgBuffer;
      try {
        imgBuffer = entry.getData();
        if (!imgBuffer || imgBuffer.length === 0) throw new Error("Empty image data");
        fs.writeFileSync(destPath, imgBuffer);
      } catch (writeErr) {
        console.warn(`Failed to write ${type} for card ${card.id} (${originalName}):`, writeErr.message);
        writeErrors.push({ filename: originalName, reason: writeErr.message });
        continue;
      }

      try {
        if (type === "photo") {
          deleteProfileImage(card.profileImageUrl);
          const newUrl = `/uploads/profiles/${tenantId}/${filename}`;
          await card.update({ profileImageUrl: newUrl });
          updatedPhotoIds.add(card.id);
          linkedPhotos++;
          console.log(`[upload-photos] Photo linked: ${originalName} → card ${card.id}`);
        } else {
          // QR — remove old QR file and update metadata.qrImageUrl
          const oldQr = (card.metadata || {}).qrImageUrl;
          if (oldQr) {
            try { const p = path.join(__dirname, "..", oldQr); if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
          }
          const newUrl = `/uploads/qr/${tenantId}/${filename}`;
          await card.update({ metadata: { ...card.metadata, qrImageUrl: newUrl } });
          updatedQrIds.add(card.id);
          linkedQr++;
          console.log(`[upload-photos] QR linked: ${originalName} → card ${card.id}`);
        }
      } catch (dbErr) {
        try { fs.unlinkSync(destPath); } catch {}
        console.warn(`DB update failed for card ${card.id}:`, dbErr.message);
        writeErrors.push({ filename: originalName, reason: "Database update failed" });
      }
    }

    const linked = linkedPhotos + linkedQr;
    const status = writeErrors.length > 0 ? 207 : 200;
    return res.status(status).json({
      message: `Upload complete: ${linkedPhotos} photos linked, ${linkedQr} QR codes linked, ${skipped} skipped${writeErrors.length > 0 ? `, ${writeErrors.length} failed` : ""}`,
      summary: { linkedPhotos, linkedQr, linked, skipped, skippedImages: unmatchedImages.length, failed: writeErrors.length },
      ...(unmatchedImages.length > 0 && { skippedImages: unmatchedImages }),
      ...(writeErrors.length > 0 && { errors: writeErrors }),
    });
  },
);

module.exports = router;
