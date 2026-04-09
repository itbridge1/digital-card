const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { Card, Tenant, CardRegister, User, CardTemplate } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

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

// All routes require authentication and tenant role
router.use(protect, authorize("tenant"));

/**
 * GET /api/tenant/me
 * Get the current tenant user's organization info
 */
router.get("/me", async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      where: { tenantId: req.user.tenantId },
      attributes: ["id", "tenantId", "name", "type", "contactEmail", "logoUrl", "isActive"],
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    res.status(500).json({ success: false, error: "Failed to fetch organization info" });
  }
});

/**
 * PUT /api/tenant/me/logo
 * Update the organization's logo URL
 */
router.put("/me/logo", async (req, res) => {
  try {
    const { logoUrl } = req.body;
    if (typeof logoUrl === "undefined") {
      return res.status(400).json({ success: false, error: "logoUrl is required" });
    }

    const tenant = await Tenant.findOne({ where: { tenantId: req.user.tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    tenant.logoUrl = logoUrl || null;
    await tenant.save();

    res.json({ success: true, message: "Logo updated successfully", data: { logoUrl: tenant.logoUrl } });
  } catch (error) {
    console.error("Error updating logo:", error);
    res.status(500).json({ success: false, error: "Failed to update logo" });
  }
});

/**
 * GET /api/tenant/cards
 * List all card holders in the authenticated tenant's organization
 */
router.get("/cards", async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const [cards, templates] = await Promise.all([
      Card.findAll({ where: { tenantId }, order: [["createdAt", "DESC"]] }),
      CardTemplate.findAll({ where: { tenantId }, order: [["isDefault", "DESC"], ["createdAt", "ASC"]] }),
    ]);

    res.json({ success: true, count: cards.length, data: cards, templates });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card holders" });
  }
});

/**
 * GET /api/tenant/cards/by-tag/:tagId
 * Get a specific card holder by NFC tag ID (must belong to this tenant)
 */
router.get("/cards/by-tag/:tagId", async (req, res) => {
  try {
    const tagId = String(req.params.tagId || "").trim().toUpperCase();
    const card = await Card.findOne({
      where: { tagId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card not found" });
    }

    const tenant = await Tenant.findOne({
      where: { tenantId: req.user.tenantId },
      attributes: ["id", "tenantId", "name", "type", "contactEmail", "logoUrl", "isActive"],
    });

    // Include template fields if card was created from a template
    let templateFields = null;
    const templateId = card.metadata?.__templateId;
    if (templateId) {
      try {
        const tpl = await CardTemplate.findOne({
          where: { id: templateId, tenantId: req.user.tenantId },
          attributes: ["id", "name", "fields"],
        });
        if (tpl) templateFields = tpl.fields;
      } catch { /* non-fatal */ }
    }

    res.json({ success: true, data: card, tenant, templateFields });
  } catch (error) {
    console.error("Error fetching card by tag:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card" });
  }
});

/**
 * GET /api/tenant/cards/:cardId
 * Get a specific card holder (must belong to this tenant)
 */
router.get("/cards/:cardId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card holder not found" });
    }

    res.json({ success: true, data: card });
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card holder" });
  }
});

/**
 * PUT /api/tenant/cards/bulk-design
 * Apply card design settings (design variant + theme) to multiple card holders at once.
 * NOTE: must be registered BEFORE PUT /cards/:cardId to prevent Express treating
 * the literal string "bulk-design" as a :cardId parameter.
 */
router.put("/cards/bulk-design", async (req, res) => {
  try {
    const { cardIds, designSettings } = req.body;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: "cardIds must be a non-empty array" });
    }
    if (!designSettings || typeof designSettings !== "object" || Array.isArray(designSettings)) {
      return res.status(400).json({ success: false, error: "designSettings must be an object" });
    }

    // Whitelist only known design keys to prevent metadata pollution
    const ALLOWED_KEYS = ["design", "preset", "primaryColor", "secondaryColor", "accentColor", "surfaceColor", "textColor", "nameTextColor", "valueTextColor", "fontFamily", "isDark", "contrast", "hiddenFields"];
    const sanitized = {};
    for (const key of ALLOWED_KEYS) {
      if (key in designSettings) sanitized[key] = designSettings[key];
    }

    const cards = await Card.findAll({
      where: { id: cardIds, tenantId: req.user.tenantId },
    });

    if (cards.length === 0) {
      return res.status(404).json({ success: false, error: "No matching cards found for this tenant" });
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
 * DELETE /api/tenant/cards/bulk
 * Permanently delete multiple card holders and remove their profile images.
 */
router.delete("/cards/bulk", async (req, res) => {
  try {
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

    const cards = await Card.findAll({
      where: { tenantId: req.user.tenantId, id: { [Op.in]: normalizedCardIds } },
    });

    cards.forEach((card) => deleteProfileImage(card.profileImageUrl));

    const deletedCount = await Card.destroy({
      where: { tenantId: req.user.tenantId, id: { [Op.in]: normalizedCardIds } },
    });

    res.json({
      success: true,
      message: `${deletedCount} card holder(s) deleted successfully`,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error("Error bulk deleting cards:", error);
    res.status(500).json({ success: false, error: "Failed to delete card holders" });
  }
});

/**
 * PUT /api/tenant/cards/:cardId
 * Soft-edit a card holder — only metadata and profile image may be changed.
 * Core fields (tagId, tenantId, businessUrl, publicUrl) are locked.
 */
router.put("/cards/:cardId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card holder not found" });
    }

    const { profileImageUrl, metadata } = req.body;

    if (profileImageUrl !== undefined) {
      card.profileImageUrl = profileImageUrl;
    }

    if (metadata) {
      const existing =
        typeof card.metadata === "string"
          ? (() => { try { return JSON.parse(card.metadata); } catch { return {}; } })()
          : card.metadata || {};
      card.metadata = { ...existing, ...metadata };
    }

    await card.save();

    res.json({ success: true, message: "Card holder updated successfully", data: card });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({ success: false, error: "Failed to update card holder" });
  }
});

/**
 * DELETE /api/tenant/cards/:cardId
 * Permanently delete a card holder and remove its profile image.
 */
router.delete("/cards/:cardId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card holder not found" });
    }

    deleteProfileImage(card.profileImageUrl);
    await card.destroy();

    res.json({ success: true, message: "Card holder deleted successfully" });
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({ success: false, error: "Failed to delete card holder" });
  }
});

/**
 * POST /api/tenant/change-password
 * Let the tenant user set a new password (required after first login / OTP reset).
 */
router.post(
  "/change-password",
  [
    body("currentPassword").notEmpty().withMessage("currentPassword is required"),
    body("newPassword")
      .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
      .matches(/[A-Za-z]/).withMessage("New password must contain at least one letter")
      .matches(/[0-9]/).withMessage("New password must contain at least one number"),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Fetch full record including password hash
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    user.password = newPassword;          // model hook will hash it
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
});

module.exports = router;
