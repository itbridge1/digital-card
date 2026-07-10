const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { protect, authorize } = require('../middleware/auth');
const { CardTemplate, Tenant, Card } = require('../models');
const { registerNfcCard } = require('../utils/nfcRegistration');

// ── Multer (Excel only, memory storage) ──────────────────────────────────────
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /xlsx|xls|csv/i.test(file.originalname.split('.').pop());
    ok ? cb(null, true) : cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
  },
});

// All routes require login
router.use(protect);

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Convert date cells (produced by cellDates:true) to dd/mm/yyyy strings
 * so the full 4-digit year is always preserved regardless of the cell's
 * number format code (e.g. built-in m/d/yy truncates to 2 digits).
 */
function normalizeDateCells(sheet) {
  Object.keys(sheet).forEach(addr => {
    if (addr[0] === '!') return;
    const cell = sheet[addr];
    // Only process numeric cells that have a date-type format string
    // cell.z is populated by cellNF:true and contains the format string
    if (cell.t === 'n' && cell.z && typeof cell.v === 'number') {
      // Date formats contain y/m/d tokens; number formats contain 0/#/?
      if (!/[ymd]/i.test(cell.z) || /[0#?]/.test(cell.z)) return;
      try {
        // Pure arithmetic — no JS Date, no timezone conversion
        const formatted = XLSX.SSF.format('dd/mm/yyyy', cell.v);
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) return;
        cell.t = 's';
        cell.v = formatted;
        cell.w = formatted;
      } catch { /* not a date cell, leave as-is */ }
    }
  });
}

/**
 * For rows without a tagId, look for an existing card in the same tenant
 * by matching on the best available unique identifier in the metadata.
 * Returns the existing tagId if found, or null.
 */
async function findExistingCardTagId(tenantId, metadata) {
  const { sequelize } = require('../config/database');
  // Prefer a stable ID field — check common keys in order
  const candidates = [
    'studentId', 'employeeId', 'rollNo', 'admissionNo', 'staffId', 'name',
  ];
  for (const field of candidates) {
    const value = metadata[field];
    if (!value) continue;
    const [rows] = await sequelize.query(
      `SELECT tagId FROM cards
       WHERE tenantId = :tenantId
         AND JSON_UNQUOTE(JSON_EXTRACT(metadata, :path)) = :value
       LIMIT 1`,
      { replacements: { tenantId, path: `$.${field}`, value: String(value) } }
    );
    if (rows[0]?.tagId) return rows[0].tagId;
  }
  return null;
}
/**
 * Validate a single field definition coming from the request body.
 * Returns a normalised field object or throws a descriptive Error.
 */
const ALLOWED_FIELD_TYPES = new Set([
  'text', 'email', 'phone', 'url', 'textarea', 'number', 'date', 'select',
]);

function validateField(f, idx) {
  if (!f || typeof f !== 'object') throw new Error(`Field[${idx}] must be an object`);

  const key = String(f.key || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
  if (!key) throw new Error(`Field[${idx}] key is required and must be alphanumeric`);

  const label = String(f.label || '').trim().slice(0, 100);
  if (!label) throw new Error(`Field[${idx}] label is required`);

  const type = String(f.type || 'text').trim().toLowerCase();
  if (!ALLOWED_FIELD_TYPES.has(type)) {
    throw new Error(`Field[${idx}] type "${type}" is not allowed`);
  }

  const options = (type === 'select' && Array.isArray(f.options))
    ? f.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 100)
    : undefined;

  return {
    key,
    label,
    type,
    required: Boolean(f.required),
    order: Number.isFinite(f.order) ? f.order : idx,
    ...(options ? { options } : {}),
  };
}

function validateFields(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('fields must be a non-empty array');
  }
  if (raw.length > 50) throw new Error('A template may have at most 50 fields');

  const fields = raw.map(validateField);

  // Enforce unique keys within a template
  const seen = new Set();
  fields.forEach((f) => {
    if (seen.has(f.key)) throw new Error(`Duplicate field key: "${f.key}"`);
    seen.add(f.key);
  });

  return fields;
}

/**
 * Resolve the effective tenantId for the acting user.
 * Admins may pass `tenantId` query / body param; others are scoped to their own tenant.
 */
async function resolveTenantId(req, fromBody = false) {
  const raw = fromBody
    ? (req.body.tenantId || req.tenantId || '')
    : (req.query.tenantId || req.tenantId || '');
  const id = String(raw || '').trim().toUpperCase();
  if (!id) throw Object.assign(new Error('tenantId is required'), { status: 400 });
  return id;
}

// ── GET /api/card-templates ────────────────────────────────────────────────────
router.get('/', authorize('admin', 'manager', 'tenant'), async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);

    const templates = await CardTemplate.findAll({
      where: { tenantId },
      order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
    });

    res.json({ success: true, count: templates.length, data: templates });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ── GET /api/card-templates/:id ───────────────────────────────────────────────
router.get('/:id', authorize('admin', 'manager', 'tenant'), async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    const template = await CardTemplate.findOne({
      where: { id: req.params.id, tenantId },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ── POST /api/card-templates ───────────────────────────────────────────────────
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req, true);

    // Managers may only create templates for their own tenant
    if (req.user.role === 'manager' && req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const name = String(req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const description = String(req.body.description || '').trim().slice(0, 500) || null;

    let fields;
    try { fields = validateFields(req.body.fields); }
    catch (e) { return res.status(400).json({ success: false, error: e.message }); }

    const makeDefault = Boolean(req.body.isDefault);

    // If making default, unset any existing default for this tenant
    if (makeDefault) {
      await CardTemplate.update({ isDefault: false }, { where: { tenantId, isDefault: true } });
    }

    const template = await CardTemplate.create({
      tenantId, name, description, fields, isDefault: makeDefault,
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/card-templates/:id ────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req, true);
    const template = await CardTemplate.findOne({
      where: { id: req.params.id, tenantId },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    if (req.user.role === 'manager' && req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (req.body.name !== undefined) {
      template.name = String(req.body.name || '').trim().slice(0, 100);
    }
    if (req.body.description !== undefined) {
      template.description = String(req.body.description || '').trim().slice(0, 500) || null;
    }
    if (req.body.fields !== undefined) {
      try { template.fields = validateFields(req.body.fields); }
      catch (e) { return res.status(400).json({ success: false, error: e.message }); }
    }
    if (req.body.isDefault !== undefined) {
      const makeDefault = Boolean(req.body.isDefault);
      if (makeDefault && !template.isDefault) {
        await CardTemplate.update({ isDefault: false }, { where: { tenantId, isDefault: true } });
      }
      template.isDefault = makeDefault;
    }

    await template.save();
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/card-templates/:id ────────────────────────────────────────────
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req, true);
    const template = await CardTemplate.findOne({
      where: { id: req.params.id, tenantId },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    if (req.user.role === 'manager' && req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await template.destroy();
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ── POST /api/card-templates/preview-excel ────────────────────────────────────
/**
 * Upload an Excel/CSV file and receive:
 *   - `columns`: array of column header strings found in the file
 *   - `preview`: first 5 rows as plain objects
 * Does NOT save anything to the database.
 */
router.post(
  '/preview-excel',
  authorize('admin', 'manager'),
  (req, res, next) => {
    excelUpload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellNF: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return res.status(400).json({ success: false, error: 'Spreadsheet has no sheets' });

      const sheet = workbook.Sheets[sheetName];
      normalizeDateCells(sheet);
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
      if (rows.length === 0) return res.status(400).json({ success: false, error: 'Spreadsheet is empty' });

      const columns = Object.keys(rows[0]);
      const preview = rows.slice(0, 5);

      res.json({ success: true, columns, preview, totalRows: rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to parse Excel file' });
    }
  },
);

// ── POST /api/card-templates/:id/import ───────────────────────────────────────
/**
 * Bulk-import card holders using a template + a column-mapping object.
 *
 * Body (multipart/form-data):
 *   file        – Excel / CSV file
 *   tenantId    – target tenant
 *   mapping     – JSON string: { "Excel Column": "templateFieldKey", ... }
 *                 The special key "tagId" maps to the NFC tag identifier.
 */
router.post(
  '/:id/import',
  authorize('admin', 'manager'),
  (req, res, next) => {
    excelUpload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const tenantId = String(req.body.tenantId || req.tenantId || '').trim().toUpperCase();
      if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId is required' });

      if (req.user.role === 'manager' && req.user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      const template = await CardTemplate.findOne({ where: { id: req.params.id, tenantId } });
      if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

      // Parse column → field mapping
      let mapping;
      try {
        mapping = typeof req.body.mapping === 'string'
          ? JSON.parse(req.body.mapping)
          : (req.body.mapping || {});
        if (typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error();
      } catch {
        return res.status(400).json({ success: false, error: 'mapping must be a valid JSON object' });
      }

      // Validate mapping keys against template fields (+ reserved "tagId" key)
      const validKeys = new Set(['tagId', ...template.fields.map((f) => f.key)]);
      for (const [col, key] of Object.entries(mapping)) {
        if (key && !validKeys.has(key)) {
          return res.status(400).json({
            success: false,
            error: `Mapping target "${key}" is not a field in this template`,
          });
        }
      }

      // Parse workbook
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellNF: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return res.status(400).json({ success: false, error: 'Spreadsheet has no sheets' });

      const sheet = workbook.Sheets[sheetName];
      normalizeDateCells(sheet);
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
      if (rows.length === 0) return res.status(400).json({ success: false, error: 'Spreadsheet is empty' });

      const created = [];
      const skipped = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const metadata = {};
        let rawTagId = '';

        for (const [excelCol, fieldKey] of Object.entries(mapping)) {
          if (!fieldKey) continue;
          const cellValue = String(row[excelCol] ?? '').trim();
          if (!cellValue) continue;

          if (fieldKey === 'tagId') {
            rawTagId = cellValue;
          } else {
            metadata[fieldKey] = cellValue;
          }
        }

        // Store templateId reference so the card knows which schema applies
        metadata.__templateId = template.id;

        // Resolve tagId: use Excel value or generate new PENDING.
        // Do NOT call findExistingCardTagId during bulk import — it can match cards
        // created earlier in the same batch (e.g. two students with the same name),
        // causing those rows to silently update instead of creating new entries.
        let tagId = rawTagId
          || `PENDING-${uuidv4().toUpperCase().replace(/-/g, '').slice(0, 12)}`;

        try {
          const { card } = await registerNfcCard({
            tagId,
            tenantId,
            status: 'registered',
            metadata,
            actorUserId: req.user.id,
            actorRole: req.user.role,
            actorTenantId: req.user.tenantId,
          });
          created.push({ row: rowNum, tagId: card.tagId, pending: !rawTagId });
        } catch (err) {
          if (err.statusCode === 409 || /already registered/i.test(err.message || '')) {
            skipped.push({ row: rowNum, tagId, reason: 'Tag ID already registered' });
          } else {
            failed.push({ row: rowNum, tagId, reason: err.message || 'Unknown error' });
          }
        }
      }

      res.status(201).json({
        success: true,
        message: `Import complete: ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`,
        summary: { created: created.length, skipped: skipped.length, failed: failed.length },
        details: { created, skipped, failed },
      });
    } catch (err) {
      console.error('Dynamic import error:', err);
      res.status(500).json({ success: false, error: 'Failed to import cards' });
    }
  },
);

module.exports = router;
