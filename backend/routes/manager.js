const express = require('express');
const router = express.Router();
const { Card, Tenant } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin or manager role
router.use(protect, authorize('admin', 'manager'));

/**
 * GET /api/manager/organizations
 * List all organizations
 */
router.get('/organizations', async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: tenants.length, data: tenants });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
});

/**
 * POST /api/manager/organizations
 * Create a new organization
 */
router.post('/organizations', async (req, res) => {
  try {
    const { tenantId, name, type, contactEmail, logoUrl } = req.body;

    if (!tenantId || !name || !type || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, name, type, and contactEmail are required'
      });
    }

    const existing = await Tenant.findOne({
      where: { tenantId: tenantId.toUpperCase() }
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Organization ID already exists' });
    }

    const tenant = await Tenant.create({
      tenantId: tenantId.toUpperCase(),
      name,
      type,
      contactEmail,
      logoUrl: logoUrl || null
    });

    res.status(201).json({ success: true, message: 'Organization created successfully', data: tenant });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ success: false, error: 'Failed to create organization' });
  }
});

/**
 * PUT /api/manager/organizations/:tenantId
 * Update an organization
 */
router.put('/organizations/:tenantId', async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      where: { tenantId: req.params.tenantId.toUpperCase() }
    });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const { name, type, contactEmail, logoUrl, isActive } = req.body;
    if (name) tenant.name = name;
    if (type) tenant.type = type;
    if (contactEmail) tenant.contactEmail = contactEmail;
    if (logoUrl !== undefined) tenant.logoUrl = logoUrl;
    if (typeof isActive !== 'undefined') tenant.isActive = isActive;

    await tenant.save();
    res.json({ success: true, message: 'Organization updated successfully', data: tenant });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ success: false, error: 'Failed to update organization' });
  }
});

/**
 * DELETE /api/manager/organizations/:tenantId
 * Deactivate an organization (admin only)
 */
router.delete('/organizations/:tenantId', authorize('admin'), async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      where: { tenantId: req.params.tenantId.toUpperCase() }
    });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    tenant.isActive = false;
    await tenant.save();
    res.json({ success: true, message: 'Organization deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate organization' });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/cards
 * List all card holders in an organization
 */
router.get('/organizations/:tenantId/cards', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const cards = await Card.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: cards.length, data: cards, tenant });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch card holders' });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/cards/:tagId
 * Get a specific card holder by tag ID within an organization
 */
router.get('/organizations/:tenantId/cards/:tagId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tagId = req.params.tagId.toUpperCase();
    
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const card = await Card.findOne({
      where: { tenantId, tagId }
    });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    res.json({ success: true, data: card, tenant });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch card' });
  }
});

/**
 * POST /api/manager/organizations/:tenantId/cards
 * Add a new card holder to an organization
 */
router.post('/organizations/:tenantId/cards', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId, isActive: true } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found or inactive' });
    }

    const { tagId, profileImageUrl, metadata } = req.body;
    if (!tagId) {
      return res.status(400).json({ success: false, error: 'tagId is required' });
    }

    const existing = await Card.findOne({ where: { tagId: tagId.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'This tag ID is already registered' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const card = await Card.create({
      tenantId,
      tagId: tagId.toUpperCase(),
      businessUrl: `${baseUrl}/t/${tagId.toUpperCase()}`,
      profileImageUrl: profileImageUrl || null,
      metadata: metadata || {}
    });

    res.status(201).json({ success: true, message: 'Card holder added successfully', data: card });
  } catch (error) {
    console.error('Error adding card holder:', error);
    res.status(500).json({ success: false, error: 'Failed to add card holder' });
  }
});

/**
 * PUT /api/manager/organizations/:tenantId/cards/:cardId
 * Update a card holder
 */
router.put('/organizations/:tenantId/cards/:cardId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId }
    });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card holder not found' });
    }

    const { profileImageUrl, metadata, isActive } = req.body;
    if (profileImageUrl !== undefined) card.profileImageUrl = profileImageUrl;
    if (metadata) card.metadata = { ...card.metadata, ...metadata };
    if (typeof isActive !== 'undefined') card.isActive = isActive;

    await card.save();
    res.json({ success: true, message: 'Card holder updated successfully', data: card });
  } catch (error) {
    console.error('Error updating card holder:', error);
    res.status(500).json({ success: false, error: 'Failed to update card holder' });
  }
});

/**
 * DELETE /api/manager/organizations/:tenantId/cards/:cardId
 * Remove a card holder from an organization
 */
router.delete('/organizations/:tenantId/cards/:cardId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const card = await Card.findOne({
      where: { id: req.params.cardId, tenantId }
    });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card holder not found' });
    }

    await card.destroy();
    res.json({ success: true, message: 'Card holder removed successfully' });
  } catch (error) {
    console.error('Error removing card holder:', error);
    res.status(500).json({ success: false, error: 'Failed to remove card holder' });
  }
});

/**
 * GET /api/manager/organizations/:tenantId/export
 * Get all card data for export (used by frontend for ZIP generation)
 */
router.get('/organizations/:tenantId/export', async (req, res) => {
  try {
    const tenantId = req.params.tenantId.toUpperCase();
    const tenant = await Tenant.findOne({ where: { tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const cards = await Card.findAll({
      where: { tenantId, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        organization: tenant,
        cards,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching export data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch export data' });
  }
});

module.exports = router;
