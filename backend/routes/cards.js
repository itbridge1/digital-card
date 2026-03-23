const express = require("express");
const router = express.Router();
const { Card, CardRegister, User, Tenant } = require("../models");
const { protect, authorize } = require("../middleware/auth");
const { Op } = require("sequelize");
const { registerNfcCard } = require("../utils/nfcRegistration");

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
    const where = {};
    if (req.query.tenantId) {
      where.tenantId = String(req.query.tenantId).toUpperCase();
    }

    const rows = await CardRegister.findAll({
      where,
      include: [
        { model: User, attributes: ["id", "name", "email", "tenantId"] },
        { model: Tenant, attributes: ["tenantId", "name", "type"] },
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
    const {
      tagId,
      tenantId,
      businessUrl,
      redirectUrl,
      status,
      metadata,
    } = req.body;

    const { card, cardRegister, shortCode } = await registerNfcCard({
      tagId,
      tenantId: tenantId || req.tenantId,
       businessUrl,
      redirectUrl,
      status,
      metadata,
      actorUserId: req.user.id,
      actorRole: req.user.role,
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
    if (metadata) card.metadata = { ...card.metadata, ...metadata };
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
