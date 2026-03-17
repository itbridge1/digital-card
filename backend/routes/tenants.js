const express = require('express');
const router = express.Router();
const { Tenant } = require('../models');
const { protect, authorize } = require('../middleware/auth');

/**
 * GET /api/tenants
 * List all active tenants
 * Public route (needed for registration)
 */
router.get('/', async (req, res) => {
  try {
    const tenants = await Tenant.findAll({ 
      where: { isActive: true },
      attributes: ['id', 'tenantId', 'name', 'type', 'contactEmail']
    });
    
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
 * Protected route - admin only
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { tenantId, name, type, contactEmail } = req.body;

    if (!tenantId || !name || !type || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, name, type, and contactEmail are required'
      });
    }

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({
      where: { tenantId: tenantId.toUpperCase() }
    });

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        error: 'Tenant ID already exists'
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
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant'
    });
  }
});

module.exports = router;
