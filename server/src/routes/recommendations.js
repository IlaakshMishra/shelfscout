const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../db');
const { getRecommendationsAndMood } = require('../services/vision');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows: shelf } = await query(
      `SELECT b.title, b.author FROM library_entries le
       JOIN books b ON b.id = le.book_id
       WHERE le.user_id = $1 ORDER BY le.added_at DESC LIMIT 60`,
      [req.user.id]
    );
    if (shelf.length === 0) {
      return res.status(400).json({ error: 'Scan a shelf first — recommendations need your library' });
    }
    const { recommendations, mood } = await getRecommendationsAndMood(shelf);
    const withAvailability = await Promise.all(
      recommendations.map(async (rec) => {
        const { rows: stores } = await query(
          `SELECT DISTINCT u.id AS store_id, u.store_name
           FROM inventory i
           JOIN books b ON b.id = i.book_id
           JOIN users u ON u.id = i.business_id
           WHERE i.in_stock
             AND lower(b.title) % lower($1)
             AND similarity(lower(b.title), lower($1)) > 0.45
           LIMIT 5`,
          [rec.title]
        );
        return { ...rec, availableAt: stores };
      })
    );
    return res.json({ mood, recommendations: withAvailability });
  } catch (e) { return next(e); }
});

module.exports = router;
