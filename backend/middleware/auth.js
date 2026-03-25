const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token — no hardcoded fallback; JWT_SECRET must be set
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Tenant,
          attributes: ['tenantId', 'name', 'type']
        }]
      });

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized, user not found or inactive'
        });
      }

      // Set tenantId for tenant isolation
      req.tenantId = req.user.tenantId;

      next();
    } catch (error) {
      // Do not leak JWT error details to the client
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
};

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
