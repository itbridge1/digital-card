const express = require("express");
const router = express.Router();
const { Card, Tenant, CardRegister, User, CardTemplate } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { registerNfcCard } = require("../utils/nfcRegistration");
const { Op } = require("sequelize");
const crypto = require("crypto");

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
      const { tagId, profileImageUrl, metadata, businessUrl } = req.body;

      if (!tagId) {
        return res.status(400).json({
          success: false,
          error: "tagId is required",
        });
      }

      const tagIdUpper = tagId.toUpperCase();

      // 3. Check CardRegister — must exist and belong to this organization (or be unassigned)
      const tag = await CardRegister.findOne({
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
      const existingCard = await Card.findOne({
        where: { tagId: tagIdUpper },
      });
      if (existingCard && existingCard.metadata && existingCard.metadata.name) {
        return res.status(400).json({
          success: false,
          error: "This card is already assigned to a user.",
        });
      }

      // 5. Update existing Card (created during admin NFC registration) or create if missing
      const shortCode = tag.url;
      let card;
      if (existingCard) {
        // Card was pre-created during admin scan registration — just update it with holder data
        existingCard.tenantId = tenantId;
        existingCard.metadata = { ...(existingCard.metadata || {}), ...(metadata || {}) };
        if (businessUrl) existingCard.businessUrl = businessUrl;
        if (!existingCard.publicUrl) {
          const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3030").replace(/\/$/, "");
          existingCard.publicUrl = `${frontendBase}/view/${encodeURIComponent(tagIdUpper)}`;
        }
        await existingCard.save();
        card = existingCard;
      } else {
        // Fallback: Card doesn't exist yet — register via utility
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

      // 6. Optional profile image
      if (profileImageUrl) {
        card.profileImageUrl = profileImageUrl;
        await card.save();
      }

      // 7. Update CardRegister to point to this card holder's public URL
      tag.redirectUrl = card.publicUrl;
      tag.userId = req.user.id;
      tag.tenantId = tenantId;
      tag.cardId = card.id;
      await tag.save();

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
        url: shortCode,
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

    const ALLOWED_KEYS = ["design", "preset", "primaryColor", "secondaryColor", "accentColor", "surfaceColor", "isDark", "contrast"];
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

    const available = registrations.filter((r) => !assignedSet.has(r.tagId.toUpperCase()));

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

module.exports = router;
