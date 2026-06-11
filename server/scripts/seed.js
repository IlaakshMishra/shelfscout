const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/db');

const STORES = [
  {
    email: 'dustypage@demo.com', name: 'The Dusty Page', location: 'Indiranagar, Bengaluru',
    books: [
      ['Dune', 'Frank Herbert'], ['Hyperion', 'Dan Simmons'], ['Circe', 'Madeline Miller'],
      ['The Name of the Wind', 'Patrick Rothfuss'], ['Project Hail Mary', 'Andy Weir'],
      ['Piranesi', 'Susanna Clarke'], ['The Midnight Library', 'Matt Haig'],
    ],
  },
  {
    email: 'riverside@demo.com', name: 'Riverside Reads', location: 'Koramangala, Bengaluru',
    books: [
      ['Sapiens', 'Yuval Noah Harari'], ['Thinking, Fast and Slow', 'Daniel Kahneman'],
      ['Atomic Habits', 'James Clear'], ['Educated', 'Tara Westover'],
      ['The Psychology of Money', 'Morgan Housel'], ['Deep Work', 'Cal Newport'],
    ],
  },
];

(async () => {
  const hash = await bcrypt.hash('demo-pass-123', 12);

  await query(
    `INSERT INTO users (email, password_hash, role) VALUES ('reader@demo.com', $1, 'reader')
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  for (const store of STORES) {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role, store_name, store_location)
       VALUES ($1, $2, 'business', $3, $4)
       ON CONFLICT (email) DO UPDATE SET store_name = EXCLUDED.store_name
       RETURNING id`,
      [store.email, hash, store.name, store.location]
    );
    const bizId = rows[0].id;
    for (const [title, author] of store.books) {
      const { rows: b } = await query(
        `INSERT INTO books (title, author) VALUES ($1, $2)
         ON CONFLICT (title, author) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
        [title, author]
      );
      await query(
        `INSERT INTO inventory (business_id, book_id) VALUES ($1, $2)
         ON CONFLICT (business_id, book_id) DO NOTHING`,
        [bizId, b[0].id]
      );
    }
  }
  console.log('Seeded: reader@demo.com + 2 stores (password: demo-pass-123)');
  await pool.end();
})().catch((err) => { console.error(err); process.exit(1); });
