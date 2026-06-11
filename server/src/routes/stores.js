const router = require('express').Router();
const { query } = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.store_name, u.store_location,
              COUNT(i.id) FILTER (WHERE i.in_stock)::int AS in_stock_count
       FROM users u LEFT JOIN inventory i ON i.business_id = u.id
       WHERE u.role = 'business'
       GROUP BY u.id ORDER BY u.store_name`
    );
    return res.json({ stores: rows });
  } catch (e) { return next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid store id' });
    const { rows: stores } = await query(
      `SELECT id, store_name, store_location FROM users WHERE id = $1 AND role = 'business'`,
      [id]
    );
    if (!stores[0]) return res.status(404).json({ error: 'Store not found' });
    const { rows: books } = await query(
      `SELECT b.id, b.title, b.author, b.cover_url
       FROM inventory i JOIN books b ON b.id = i.book_id
       WHERE i.business_id = $1 AND i.in_stock ORDER BY b.title`,
      [id]
    );
    return res.json({ store: stores[0], books });
  } catch (e) { return next(e); }
});

module.exports = router;
