const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const { tenantIsolation, applyTenantFilter } = require('../middleware/tenantIsolation');

// Apply tenant isolation to all routes in this router
router.use(tenantIsolation);

/**
 * GET /api/cards
 * List all cards for the authenticated tenant
 */
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find(applyTenantFilter(req))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cards.length,
      data: cards
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cards'
    });
  }
});

/**
 * GET /api/cards/:tagId
 * Get a specific card by tag ID
 */
router.get('/:tagId', async (req, res) => {
  try {
    // Decode the tagId from URL (Express should do this, but being explicit)
    const tagId = decodeURIComponent(req.params.tagId).toUpperCase();
    
    console.log('=== GET Card Debug ===');
    console.log('Raw param:', req.params.tagId);
    console.log('Looking for tagId:', tagId);
    console.log('With tenantId:', req.tenantId);
    
    // First, check if card exists at all (without tenant filter)
    const anyCard = await Card.findOne({ tagId: tagId });
    console.log('Card exists (any tenant):', anyCard ? `Yes (tenantId: ${anyCard.tenantId})` : 'No');
    
    const card = await Card.findOne({
      ...applyTenantFilter(req),
      tagId: tagId
    });
    
    console.log('Card found with tenant filter:', card ? 'Yes' : 'No');
    console.log('======================');

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card'
    });
  }
});

/**
 * POST /api/cards
 * Register a new NFC card
 */
router.post('/', async (req, res) => {
  try {
    const { tagId, businessUrl, metadata } = req.body;
    
    console.log('=== CREATE Card Debug ===');
    console.log('Creating card with tagId:', tagId?.toUpperCase());
    console.log('Using tenantId:', req.tenantId);
    console.log('=========================');

    if (!tagId || !businessUrl) {
      return res.status(400).json({
        success: false,
        error: 'tagId and businessUrl are required'
      });
    }

    // Check if tag already exists
    const existingCard = await Card.findOne({ 
      tagId: tagId.toUpperCase() 
    });

    if (existingCard) {
      return res.status(409).json({
        success: false,
        error: 'This tag ID is already registered'
      });
    }

    // Create new card
    const card = await Card.create({
      tenantId: req.tenantId,
      tagId: tagId.toUpperCase(),
      businessUrl,
      metadata: metadata || {}
    });

    res.status(201).json({
      success: true,
      message: 'Card registered successfully',
      data: card,
      redirectUrl: `${process.env.BASE_URL}/t/${card.tagId}`
    });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register card'
    });
  }
});

/**
 * PUT /api/cards/:tagId
 * Update an existing card
 */
router.put('/:tagId', async (req, res) => {
  try {
    const { businessUrl, metadata, isActive } = req.body;
    const tagId = decodeURIComponent(req.params.tagId).toUpperCase();

    const card = await Card.findOne({
      ...applyTenantFilter(req),
      tagId: tagId
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Update fields
    if (businessUrl) card.businessUrl = businessUrl;
    if (metadata) card.metadata = { ...card.metadata, ...metadata };
    if (typeof isActive !== 'undefined') card.isActive = isActive;

    await card.save();

    res.json({
      success: true,
      message: 'Card updated successfully',
      data: card
    });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update card'
    });
  }
});

/**
 * DELETE /api/cards/:tagId
 * Delete a card (soft delete by setting isActive to false)
 */
router.delete('/:tagId', async (req, res) => {
  try {
    const tagId = decodeURIComponent(req.params.tagId).toUpperCase();
    const card = await Card.findOne({
      ...applyTenantFilter(req),
      tagId: tagId
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    card.isActive = false;
    await card.save();

    res.json({
      success: true,
      message: 'Card deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete card'
    });
  }
});

/**
 * GET /api/cards/:tagId/analytics
 * Get tap analytics for a specific card
 */
router.get('/:tagId/analytics', async (req, res) => {
  try {
    const card = await Card.findOne({
      ...applyTenantFilter(req),
      tagId: req.params.tagId.toUpperCase()
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: {
        tagId: card.tagId,
        tapCount: card.tapCount,
        lastTapped: card.lastTapped,
        createdAt: card.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

module.exports = router;
