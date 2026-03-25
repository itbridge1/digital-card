const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');

// Ensure upload directories exist
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

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

/**
 * POST /api/upload/profile
 * Upload a profile image for a card holder
 */
router.post(
  '/profile',
  protect,
  authorize('admin', 'manager'),
  (req, res, next) => {
    uploadProfile.single('image')(req, res, (err) => {
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
    const safeFilename = path.basename(req.file.filename);
    const url = `/uploads/profiles/${safeFilename}`;
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
