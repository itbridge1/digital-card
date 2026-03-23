const express = require("express");
const router = express.Router();
const { Card, Tenant } = require("../models");

/**
 * GET /api/public/card/:tagId
 * Public endpoint — no auth required.
 * Returns card data + tenant info for the read-only public card view.
 */
router.get("/cardInfo/:tagId", async (req, res) => {
  try {
    const tagId = req.params.tagId.toUpperCase();

    const card = await Card.findOne({
      where: { tagId, isActive: true },
    });

    if (!card) {
      return res
        .status(404)
        .json({ success: false, error: "Card not found or inactive" });
    }

    const tenant = await Tenant.findOne({
      where: { tenantId: card.tenantId, isActive: true },
      attributes: ["tenantId", "name", "type", "logoUrl", "contactEmail"],
    });

    // Record the tap non-blocking (same as the /t/:tagId redirect)
    card.recordTap().catch((err) => console.error("Failed to record tap:", err));

    // Return only the safe public fields
    res.json({
      success: true,
      data: {
        id: card.id,
        tagId: card.tagId,
        tenantId: card.tenantId,
        businessUrl: card.businessUrl,
        publicUrl: card.publicUrl,
        profileImageUrl: card.profileImageUrl,
        metadata: card.metadata,
        tapCount: card.tapCount,
      },
      tenant: tenant || null,
    });
  } catch (error) {
    console.error("Error fetching public card:", error);
    res.status(500).json({ success: false, error: "Failed to fetch card" });
  }
});

module.exports = router;
