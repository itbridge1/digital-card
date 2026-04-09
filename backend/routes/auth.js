const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { User, Tenant } = require("../models");
const generateToken = require("../utils/generateToken");
const { protect, authorize } = require("../middleware/auth");
const crypto = require("crypto");

// Strict rate limit for authentication endpoints to mitigate brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true, // only count failed attempts
});

// Slightly more generous for register (admin-only, already protected)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many registration attempts. Please try again later." },
});

/** Generates a human-readable one-time password: e.g. Kx7#mP2! */
function generateOTP() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "#@!";
  const all = upper + lower + digits + special;
  const rand = (set) => set[crypto.randomInt(0, set.length)];
  const rest = Array.from({ length: 5 }, () => rand(all)).join("");
  return rand(upper) + rand(digits) + rand(special) + rand(lower) + rest;
}

/**
 * POST /api/auth/register
 * Create a manager account — admin only
 */
router.post(
  "/register",
  registerLimiter,
  protect,
  authorize("admin", "manager"),
  [
    body("name").notEmpty().trim().escape().withMessage("Name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("tenantId").optional({ nullable: true }).trim(),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { name, email, tenantId, role } = req.body;

      // Allowed login roles
      const allowedRoles = ["admin", "manager", "tenant"];
      const assignedRole = role || "manager";
      if (!allowedRoles.includes(assignedRole)) {
        return res.status(400).json({
          success: false,
          error: "Role must be admin, manager, or tenant",
        });
      }

      // Only admin can create admin/manager accounts
      if (["admin", "manager"].includes(assignedRole) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Only admins can create admin or manager accounts",
        });
      }

      // A manager can only create tenant accounts for organizations they own
      if (assignedRole === "tenant" && req.user.role === "manager") {
        const ownedTenant = await Tenant.findOne({
          where: { tenantId: tenantId.toUpperCase(), createdBy: req.user.id },
        });
        if (!ownedTenant) {
          return res.status(403).json({
            success: false,
            error: "You can only create tenant accounts for your own organizations",
          });
        }
      }

      // For tenant accounts, password is always auto-generated
      const isTenantRole = assignedRole === "tenant";
      const password = isTenantRole ? generateOTP() : req.body.password;

      if (!isTenantRole) {
        if (!password || password.length < 8) {
          return res.status(400).json({
            success: false,
            error: "Password must be at least 8 characters",
          });
        }
        // Basic strength: require at least one letter and one digit
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          return res.status(400).json({
            success: false,
            error: "Password must contain at least one letter and one number",
          });
        }
      }

      // Check if user exists
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(409).json({
          success: false,
          error: "User already exists with this email",
        });
      }

      // Verify tenant exists and is active (only when tenantId is provided)
      if (tenantId) {
        const tenant = await Tenant.findOne({
          where: { tenantId: tenantId.toUpperCase(), isActive: true },
        });

        if (!tenant) {
          return res.status(404).json({
            success: false,
            error: "Tenant not found or inactive",
          });
        }
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        tenantId: tenantId ? tenantId.toUpperCase() : null,
        role: assignedRole,
        mustChangePassword: isTenantRole,
      });

      const responseData = {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      };

      // Return the generated password once so the manager can share it
      if (isTenantRole) {
        responseData.generatedPassword = password;
        responseData.mustChangePassword = true;
      }

      res.status(201).json({
        success: true,
        message: isTenantRole
          ? "Tenant account created. Share the generated password with the organization."
          : "Account created successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create account",
      });
    }
  },
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({
        where: { email },
        include: [
          {
            model: Tenant,
            attributes: ["tenantId", "name", "type"],
          },
        ],
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: "Account is deactivated",
        });
      }

      // Check password
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Generate token
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
          mustChangePassword: user.mustChangePassword || false,
          tenant: user.Tenant,
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to login",
      });
    }
  },
);

/**
 * GET /api/auth/me
 * Get current user profile — uses protect middleware (no manual JWT re-verification)
 */
router.get("/me", protect, async (req, res) => {
  try {
    // req.user is already populated by protect middleware
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
    });
  }
});

/**
 * GET /api/auth/managers
 * List all admin and manager accounts — admin only
 */
router.get("/managers", protect, authorize("admin"), async (req, res) => {
  try {
    const managers = await User.findAll({
      where: { role: ["admin", "manager"] },
      attributes: { exclude: ["password"] },
      include: [{ model: Tenant, attributes: ["tenantId", "name", "type"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, count: managers.length, data: managers });
  } catch (error) {
    console.error("Get managers error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch managers" });
  }
});

/**
 * POST /api/auth/verify
 * Verify the current user's password without issuing a new token.
 * Used for sensitive destructive actions (e.g. bulk delete confirmation).
 */
router.post(
  "/verify",
  authLimiter,
  protect,
  [body("password").notEmpty().withMessage("Password is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const user = await User.findByPk(req.user.id, { attributes: ["id", "password", "isActive"] });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: "Account not found or inactive" });
      }

      const isMatch = await user.matchPassword(req.body.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: "Incorrect password" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Verify password error:", error);
      return res.status(500).json({ success: false, error: "Failed to verify password" });
    }
  },
);

/**
 * GET /api/auth/users
 * List users (admin only), optionally filter by tenantId
 */
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const where = {};
    if (req.query.tenantId) {
      where.tenantId = String(req.query.tenantId).toUpperCase();
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ["password"] },
      include: [{ model: Tenant, attributes: ["tenantId", "name", "type"] }],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

/**
 * PATCH /api/auth/managers/:id/deactivate
 * Deactivate a manager account — admin only
 */
router.patch(
  "/managers/:id/deactivate",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ["password"] },
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Account not found" });
      }
      if (user.id === req.user.id) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Cannot deactivate your own account",
          });
      }
      user.isActive = false;
      await user.save();
      res.json({ success: true, message: "Account deactivated successfully" });
    } catch (error) {
      console.error("Deactivate manager error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to deactivate account" });
    }
  },
);

/**
 * PATCH /api/auth/managers/:id/activate
 * Reactivate a manager account — admin only
 */
router.patch(
  "/managers/:id/activate",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ["password"] },
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Account not found" });
      }
      user.isActive = true;
      await user.save();
      res.json({ success: true, message: "Account activated successfully" });
    } catch (error) {
      console.error("Activate manager error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to activate account" });
    }
  },
);

/**
 * DELETE /api/auth/managers/:id
 * Permanently delete a manager account — admin only
 */
router.delete(
  "/managers/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Account not found" });
      }
      if (user.id === req.user.id) {
        return res
          .status(400)
          .json({ success: false, error: "Cannot delete your own account" });
      }
      await user.destroy();
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete manager error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete account" });
    }
  },
);

/**
 * GET /api/auth/ui-settings
 * Return the current user's stored UI preferences.
 */
router.get("/ui-settings", protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["uiSettings"],
    });
    res.json({ success: true, data: user?.uiSettings || {} });
  } catch (error) {
    console.error("Get UI settings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch UI settings" });
  }
});

/**
 * PUT /api/auth/ui-settings
 * Merge-update the current user's UI preferences.
 * Body: { hiddenCols: { [tenantId]: [colKey, ...] } }
 */
router.put("/ui-settings", protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const existing = user.uiSettings || {};
    // Shallow-merge top-level keys (e.g. hiddenCols) so other preference
    // groups are not overwritten by a partial update.
    const incoming = req.body || {};
    const merged = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        merged[key] = { ...(existing[key] || {}), ...value };
      } else {
        merged[key] = value;
      }
    }

    user.uiSettings = merged;
    await user.save();
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error("Put UI settings error:", error);
    res.status(500).json({ success: false, error: "Failed to save UI settings" });
  }
});

module.exports = router;
