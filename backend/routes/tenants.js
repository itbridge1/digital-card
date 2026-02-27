const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');

/**
 * GET /api/tenants
 * List all tenants (admin only - no auth in this basic version)
 */
router.get('/', async (req, res) => {
  try {
    const tenants = await Tenant.find({ isActive: true });
    res.json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants'
    });
  }
});

/**
 * POST /api/tenants
 * Create a new tenant
 */
router.post('/', async (req, res) => {
  try {
    const { tenantId, name, type, contactEmail } = req.body;

    if (!tenantId || !name || !type || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, name, type, and contactEmail are required'
      });
    }

    const tenant = await Tenant.create({
      tenantId: tenantId.toUpperCase(),
      name,
      type,
      contactEmail
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Tenant ID already exists'
      });
    }
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant'
    });
  }
});

module.exports = router;
