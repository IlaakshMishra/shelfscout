jest.mock('../src/services/vision', () => ({
  getRecommendationsAndMood: jest.fn(async () => ({
    recommendations: [{ title: 'Hyperion', author: 'Dan Simmons', reason: 'Epic like Dune' }],
    mood: { profileName: 'Cosmic Wanderer', summary: 'Vast worlds.', tags: ['epic'] },
  })),
}));
jest.mock('../src/services/openlibrary', () => {
  const enrichBook = jest.fn(async (b) => ({ ...b, coverUrl: null, openlibraryKey: null }));
  return { enrichBook, enrichAll: jest.fn(async (books) => Promise.all(books.map(enrichBook))) };
});
const request = require('supertest');
const { app, pool, query, resetDb, register, registerBusiness } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

test('400 when library empty', async () => {
  const { token } = await register();
  const res = await request(app).get('/api/recommendations').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(400);
});

test('returns mood and recs with availableAt store badges (fuzzy title match)', async () => {
  const { token } = await register();
  await request(app).post('/api/library/confirm').set('Authorization', `Bearer ${token}`)
    .send({ books: [{ title: 'Dune', author: 'Frank Herbert' }] });

  const biz = await registerBusiness({ storeName: 'The Dusty Page' });
  // Inventory routes arrive in Task 9 — seed inventory directly:
  const { rows: [book] } = await query(
    `INSERT INTO books (title, author) VALUES ('Hyperion', 'Dan Simmons')
     ON CONFLICT (title, author) DO UPDATE SET title = EXCLUDED.title RETURNING id`);
  await query('INSERT INTO inventory (business_id, book_id) VALUES ($1, $2)', [biz.user.id, book.id]);

  const res = await request(app).get('/api/recommendations').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.mood.profileName).toBe('Cosmic Wanderer');
  expect(res.body.recommendations[0].availableAt).toEqual([
    { store_id: biz.user.id, store_name: 'The Dusty Page' },
  ]);
});

test('out-of-stock inventory is not matched', async () => {
  const { token } = await register();
  await request(app).post('/api/library/confirm').set('Authorization', `Bearer ${token}`)
    .send({ books: [{ title: 'Dune', author: '' }] });
  const biz = await registerBusiness({ storeName: 'Closed Shelf' });
  const { rows: [book] } = await query(
    `INSERT INTO books (title, author) VALUES ('Hyperion', 'Dan Simmons')
     ON CONFLICT (title, author) DO UPDATE SET title = EXCLUDED.title RETURNING id`);
  await query('INSERT INTO inventory (business_id, book_id, in_stock) VALUES ($1, $2, false)', [biz.user.id, book.id]);

  const res = await request(app).get('/api/recommendations').set('Authorization', `Bearer ${token}`);
  expect(res.body.recommendations[0].availableAt).toEqual([]);
});
