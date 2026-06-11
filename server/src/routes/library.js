const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');
const { enrichBook, enrichAll } = require('../services/openlibrary');
const { sanitizeBooks, upsertBook } = require('../services/books');

router.use(requireAuth);

router.post('/confirm', async (req, res, next) => {
  try {
    const clean = sanitizeBooks(req.body?.books);
    if (clean.length === 0) {
      return res.status(400).json({ error: 'books array with at least one title required' });
    }
    // Validate scanId ownership: if provided, ensure it belongs to this user.
    // A client could pass any scanId (including another user's), which would incorrectly
    // associate their library entries with a foreign scan. We prevent this by verifying
    // ownership and treating unowned/nonexistent scanIds as null.
    let scanId = null;
    if (Number.isInteger(req.body?.scanId)) {
      const { rows } = await query(
        'SELECT id FROM scans WHERE id = $1 AND user_id = $2',
        [req.body.scanId, req.user.id]
      );
      scanId = rows.length > 0 ? req.body.scanId : null;
    }
    const enriched = await enrichAll(clean);
    const added = [];
    for (const book of enriched) {
      const row = await upsertBook(book);
      await query(
        `INSERT INTO library_entries (user_id, book_id, scan_id)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, book_id) DO NOTHING`,
        [req.user.id, row.id, scanId]
      );
      if (!added.some((b) => b.id === row.id)) added.push(row);
    }
    return res.status(201).json({ added });
  } catch (e) { return next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.id, b.title, b.author, b.cover_url, le.added_at
       FROM library_entries le JOIN books b ON b.id = le.book_id
       WHERE le.user_id = $1 ORDER BY le.added_at DESC`,
      [req.user.id]
    );
    return res.json({ books: rows });
  } catch (e) { return next(e); }
});

router.get('/scans', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.kind, s.photo_count, s.created_at,
              COUNT(le.id)::int AS books_added
       FROM scans s LEFT JOIN library_entries le ON le.scan_id = s.id
       WHERE s.user_id = $1 GROUP BY s.id ORDER BY s.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json({ scans: rows });
  } catch (e) { return next(e); }
});

module.exports = router;
