const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { User, Tenant } = require("../models");
const generateToken = require("../utils/generateToken");
const { protect, authorize } = require("../middleware/auth");
const crypto = require("crypto");

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
  protect,
  authorize("admin", "manager"),
  [
    body("name").notEmpty().trim().withMessage("Name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("tenantId").notEmpty().withMessage("Tenant ID is required"),
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

      if (!isTenantRole && (!password || password.length < 6)) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 6 characters",
        });
      }

      // Check if user exists
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(409).json({
          success: false,
          error: "User already exists with this email",
        });
      }

      // Verify tenant exists and is active
      const tenant = await Tenant.findOne({
        where: { tenantId: tenantId.toUpperCase(), isActive: true },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: "Tenant not found or inactive",
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        tenantId: tenantId.toUpperCase(),
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
 * Get current user profile
 */
router.get("/me", async (req, res) => {
  try {
    // Extract token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized",
      });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "nfc-platform-secret-key",
    );

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Tenant,
          attributes: ["tenantId", "name", "type"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
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

module.exports = router;
