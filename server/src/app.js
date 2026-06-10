const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

const skipInTest = { skip: () => config.isTest, standardHeaders: true, legacyHeaders: false };
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, ...skipInTest });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, ...skipInTest });
app.use(globalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Routes mounted in later tasks:
// app.use('/api/auth', authLimiter, require('./routes/auth'));
// app.use('/api/scan', require('./routes/scan'));
// app.use('/api/library', require('./routes/library'));
// app.use('/api/recommendations', require('./routes/recommendations'));
// app.use('/api/inventory', require('./routes/inventory'));
// app.use('/api/stores', require('./routes/stores'));
// app.use('/api/search', require('./routes/search'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? 'Invalid request body' : 'Internal server error' });
});

module.exports = app;
module.exports.authLimiter = authLimiter;
