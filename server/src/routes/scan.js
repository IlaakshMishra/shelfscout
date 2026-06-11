const router = require('express').Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { extractTitles } = require('../services/vision');
const { query } = require('../db');
const config = require('../config');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(), // photos live in RAM only and are garbage-collected after this request
  limits: { files: 2, fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  skip: () => config.isTest, standardHeaders: true, legacyHeaders: false,
});

router.post('/', requireAuth, scanLimiter, (req, res, next) => {
  upload.array('photos', 2)(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Maximum 2 photos per scan'
          : err.code === 'LIMIT_FILE_SIZE'
            ? 'Each photo must be under 8MB'
            : err.message === 'UNSUPPORTED_TYPE'
              ? 'Only JPEG, PNG or WebP images are accepted'
              : 'Upload failed';
      return res.status(400).json({ error: msg });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'At least one photo required' });
      }
      const books = await extractTitles(req.files);
      const kind = req.user.role === 'business' && req.query.kind === 'store' ? 'store' : 'shelf';
      const { rows } = await query(
        'INSERT INTO scans (user_id, kind, photo_count) VALUES ($1, $2, $3) RETURNING id',
        [req.user.id, kind, req.files.length]
      );
      return res.json({ scanId: rows[0].id, books });
    } catch (e) { return next(e); }
  });
});

module.exports = router;
