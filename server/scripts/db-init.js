const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema applied to', process.env.NODE_ENV === 'test' ? 'test DB' : 'dev DB');
  await pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
