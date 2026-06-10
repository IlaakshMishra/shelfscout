const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const config = require('../config');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sign = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '24h', algorithm: 'HS256' });

const publicUser = (u) => ({
  id: u.id, email: u.email, role: u.role,
  store_name: u.store_name, store_location: u.store_location,
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, storeName, storeLocation } = req.body || {};
    if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Valid email required' });
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!['reader', 'business'].includes(role)) {
      return res.status(400).json({ error: 'Role must be reader or business' });
    }
    if (role === 'business' && !String(storeName || '').trim()) {
      return res.status(400).json({ error: 'Store name required for business accounts' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role, store_name, store_location)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role, store_name, store_location`,
      [email.toLowerCase(), hash, role,
       role === 'business' ? String(storeName).trim().slice(0, 120) : null,
       role === 'business' && storeLocation ? String(storeLocation).trim().slice(0, 200) : null]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Email already registered' });
    return res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
  } catch (err) { return next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [String(email || '').toLowerCase()]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(String(password || ''), user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) { return next(err); }
});

module.exports = router;
