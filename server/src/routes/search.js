const router = require('express').Router();
const { query } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 200);
    if (q.length < 2) return res.status(400).json({ error: 'Search needs at least 2 characters' });
    const { rows } = await query(
      `SELECT b.id, b.title, b.author, b.cover_url, u.id AS store_id, u.store_name
       FROM inventory i
       JOIN books b ON b.id = i.book_id
       JOIN users u ON u.id = i.business_id
       WHERE i.in_stock
         AND (b.title ILIKE '%' || $1 || '%'
              OR (lower(b.title) % lower($1) AND similarity(lower(b.title), lower($1)) > 0.35))
       ORDER BY similarity(lower(b.title), lower($1)) DESC
       LIMIT 50`,
      [q]
    );
    return res.json({ results: rows });
  } catch (e) { return next(e); }
});

module.exports = router;
