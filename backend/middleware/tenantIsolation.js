/**
 * Tenant Isolation Middleware
 * Ensures that each tenant can only access their own data
 * 
 * Usage: Add this middleware to routes that need tenant isolation
 * The tenantId should be passed via headers, query params, or request body
 */

const Tenant = require('../models/Tenant');

/**
 * Extract and validate tenant ID from the request
 * Looks for tenantId in: headers > query > body
 */
const tenantIsolation = async (req, res, next) => {
  try {
    // Extract tenantId from various sources (priority: header > query > body)
    const tenantId = 
      req.headers['x-tenant-id'] || 
      req.query.tenantId || 
      req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required. Provide it via header (x-tenant-id), query param, or body.'
      });
    }

    // Verify tenant exists and is active
    const tenant = await Tenant.findOne({ 
      tenantId: tenantId.toUpperCase(), 
      isActive: true 
    });

    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or inactive tenant'
      });
    }

    // Attach tenant info to request for use in routes
    req.tenant = tenant;
    req.tenantId = tenant.tenantId;

    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    res.status(500).json({
      success: false,
      error: 'Tenant validation failed'
    });
  }
};

/**
 * Apply tenant filter to Mongoose queries
 * This ensures all DB queries are automatically scoped to the tenant
 */
const applyTenantFilter = (req) => {
  return { tenantId: req.tenantId };
};

module.exports = {
  tenantIsolation,
  applyTenantFilter
};
