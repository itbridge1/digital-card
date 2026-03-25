const express = require("express");
const router = express.Router();
const { Card, Tenant, CardRegister, User } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

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
    const cards = await Card.findAll({
      where: { tenantId: req.user.tenantId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: cards.length, data: cards });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card holders" });
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
 * Soft-delete a card holder — sets isActive to false instead of destroying the record.
 */
router.delete("/cards/:cardId", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card holder not found" });
    }

    card.isActive = false;
    await card.save();

    res.json({ success: true, message: "Card holder deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating card:", error);
    res.status(500).json({ success: false, error: "Failed to deactivate card holder" });
  }
});

/**
 * PATCH /api/tenant/cards/:cardId/restore
 * Re-activate a previously soft-deleted card holder.
 */
router.patch("/cards/:cardId/restore", async (req, res) => {
  try {
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId: req.user.tenantId },
    });

    if (!card) {
      return res.status(404).json({ success: false, error: "Card holder not found" });
    }

    card.isActive = true;
    await card.save();

    res.json({ success: true, message: "Card holder restored successfully", data: card });
  } catch (error) {
    console.error("Error restoring card:", error);
    res.status(500).json({ success: false, error: "Failed to restore card holder" });
  }
});

/**
 * POST /api/tenant/change-password
 * Let the tenant user set a new password (required after first login / OTP reset).
 */
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "New password must be at least 8 characters" });
    }

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
