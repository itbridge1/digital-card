const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');

// Ensure base upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PROFILES_DIR = path.join(UPLOAD_DIR, 'profiles');
const LOGOS_DIR = path.join(UPLOAD_DIR, 'logos');

[UPLOAD_DIR, PROFILES_DIR, LOGOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Only allow image types for security
const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Profile uploads use memory storage so the route handler can determine
// the tenant subdirectory after auth middleware has run.
const uploadProfileMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

/**
 * POST /api/upload/profile
 * Upload a profile image for a card holder.
 * Accepts an optional `tenantId` form field (or query param) to store the
 * image under uploads/profiles/{tenantId}/ — consistent with import-zip.
 * Filename format: {uuid}_{originalname}  (same as import-zip).
 */
router.post(
  '/profile',
  protect,
  authorize('admin', 'manager', 'tenant'),
  (req, res, next) => {
    uploadProfileMemory.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Resolve tenantId: form field > JWT claim
    const rawTenantId = (req.body?.tenantId || req.user?.tenantId || '').trim().toUpperCase();

    // Determine destination directory
    const destDir = rawTenantId
      ? path.join(PROFILES_DIR, rawTenantId)
      : PROFILES_DIR;
    fs.mkdirSync(destDir, { recursive: true });

    // Build filename: {uuid}_{originalname} (same convention as import-zip)
    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = path.basename(req.file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
      .trim();
    const filename = `${uuidv4()}_${safeName}${ext}`;
    const destPath = path.join(destDir, filename);

    fs.writeFileSync(destPath, req.file.buffer);

    const url = rawTenantId
      ? `/uploads/profiles/${rawTenantId}/${filename}`
      : `/uploads/profiles/${filename}`;

    res.json({ success: true, url });
  }
);

/**
 * POST /api/upload/logo
 * Upload an organization logo
 */
router.post(
  '/logo',
  protect,
  authorize('admin', 'manager'),
  (req, res, next) => {
    uploadLogo.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    // Use path.basename to prevent any path traversal in filenames
    const safeFilename = path.basename(req.file.filename);
    const url = `/uploads/logos/${safeFilename}`;
    res.json({ success: true, url });
  }
);

module.exports = router;
