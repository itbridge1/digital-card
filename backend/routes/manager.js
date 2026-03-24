const express = require("express");
const router = express.Router();
const { Card, Tenant, CardRegister } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { registerNfcCard } = require("../utils/nfcRegistration");
const { Op } = require("sequelize");
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
    const tenants = await Tenant.findAll({
      where,
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

    const cards = await Card.findAll({
      where: { tenantId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: cards.length, data: cards, tenant });
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

    res.json({ success: true, data: card, tenant });
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

module.exports = router;
