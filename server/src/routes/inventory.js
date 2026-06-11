const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../db');
const { enrichAll } = require('../services/openlibrary');
const { sanitizeBooks, upsertBook } = require('../services/books');

router.use(requireAuth, requireRole('business'));

router.post('/preview', async (req, res, next) => {
  try {
    const clean = sanitizeBooks(req.body?.books);
    if (clean.length === 0) return res.status(400).json({ error: 'books array required' });
    const newBooks = [];
    const existing = [];
    for (const book of clean) {
      const { rows } = await query(
        `SELECT 1 FROM inventory i JOIN books b ON b.id = i.book_id
         WHERE i.business_id = $1
           AND lower(b.title) % lower($2)
           AND similarity(lower(b.title), lower($2)) > 0.6
         LIMIT 1`,
        [req.user.id, book.title]
      );
      (rows[0] ? existing : newBooks).push(book);
    }
    return res.json({ newBooks, existing });
  } catch (e) { return next(e); }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const clean = sanitizeBooks(req.body?.books);
    if (clean.length === 0) return res.status(400).json({ error: 'books array required' });
    const enriched = await enrichAll(clean);
    const added = [];
    for (const book of enriched) {
      const row = await upsertBook(book);
      await query(
        `INSERT INTO inventory (business_id, book_id, in_stock)
         VALUES ($1, $2, true)
         ON CONFLICT (business_id, book_id)
         DO UPDATE SET in_stock = true, updated_at = now()`,
        [req.user.id, row.id]
      );
      added.push(row);
    }
    return res.status(201).json({ added });
  } catch (e) { return next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.book_id, i.in_stock, i.updated_at, b.title, b.author, b.cover_url
       FROM inventory i JOIN books b ON b.id = i.book_id
       WHERE i.business_id = $1 ORDER BY b.title`,
      [req.user.id]
    );
    return res.json({ items: rows });
  } catch (e) { return next(e); }
});

router.patch('/:bookId', async (req, res, next) => {
  try {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) return res.status(400).json({ error: 'Invalid book id' });
    if (typeof req.body?.inStock !== 'boolean') {
      return res.status(400).json({ error: 'inStock boolean required' });
    }
    const { rows } = await query(
      `UPDATE inventory SET in_stock = $1, updated_at = now()
       WHERE business_id = $2 AND book_id = $3 RETURNING *`,
      [req.body.inStock, req.user.id, bookId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not in your inventory' });
    return res.json({ item: rows[0] });
  } catch (e) { return next(e); }
});

module.exports = router;
