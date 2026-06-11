jest.mock('../src/services/openlibrary', () => {
  const enrichBook = jest.fn(async (b) => ({ ...b, coverUrl: 'http://cover/x.jpg', openlibraryKey: '/works/X' }));
  return { enrichBook, enrichAll: jest.fn(async (books) => Promise.all(books.map(enrichBook))) };
});
const request = require('supertest');
const { app, pool, resetDb, register, query } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const confirm = (token, body) =>
  request(app).post('/api/library/confirm').set('Authorization', `Bearer ${token}`).send(body);

test('confirm saves edited list, dedupes, returns added books', async () => {
  const { token } = await register();
  const res = await confirm(token, {
    books: [
      { title: 'Dune', author: 'Frank Herbert' },
      { title: 'Dune', author: 'Frank Herbert' },
      { title: '  Circe ', author: '' },
    ],
  });
  expect(res.status).toBe(201);
  const lib = await request(app).get('/api/library').set('Authorization', `Bearer ${token}`);
  expect(lib.status).toBe(200);
  expect(lib.body.books).toHaveLength(2);
  expect(lib.body.books.map((b) => b.title).sort()).toEqual(['Circe', 'Dune']);
  expect(lib.body.books[0].cover_url).toBe('http://cover/x.jpg');
});

test('confirm rejects empty or invalid payloads', async () => {
  const { token } = await register();
  expect((await confirm(token, { books: [] })).status).toBe(400);
  expect((await confirm(token, { books: 'nope' })).status).toBe(400);
  expect((await confirm(token, {})).status).toBe(400);
});

test('re-confirming same book does not duplicate library entry', async () => {
  const { token } = await register();
  await confirm(token, { books: [{ title: 'Dune', author: 'Frank Herbert' }] });
  await confirm(token, { books: [{ title: 'Dune', author: 'Frank Herbert' }] });
  const lib = await request(app).get('/api/library').set('Authorization', `Bearer ${token}`);
  expect(lib.body.books).toHaveLength(1);
});

test('users only see their own library', async () => {
  const a = await register();
  const b = await register();
  await confirm(a.token, { books: [{ title: 'Dune', author: '' }] });
  const lib = await request(app).get('/api/library').set('Authorization', `Bearer ${b.token}`);
  expect(lib.body.books).toHaveLength(0);
});

test('GET /api/library/scans returns scan history with counts', async () => {
  const { token } = await register();
  await confirm(token, { books: [{ title: 'Dune', author: '' }] });
  const res = await request(app).get('/api/library/scans').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.scans)).toBe(true);
});

test('confirm links entries to own scan; foreign scanId coerced to null', async () => {
  const a = await register();
  const b = await register();
  const { rows: [scanA] } = await query(
    "INSERT INTO scans (user_id, kind, photo_count) VALUES ($1, 'shelf', 1) RETURNING id", [a.user.id]);

  await confirm(a.token, { scanId: scanA.id, books: [{ title: 'Dune', author: '' }] });
  const { rows: linked } = await query('SELECT scan_id FROM library_entries WHERE user_id = $1', [a.user.id]);
  expect(linked[0].scan_id).toBe(scanA.id);

  await confirm(b.token, { scanId: scanA.id, books: [{ title: 'Circe', author: '' }] });
  const { rows: foreign } = await query('SELECT scan_id FROM library_entries WHERE user_id = $1', [b.user.id]);
  expect(foreign[0].scan_id).toBeNull();
});

test('scan history books_added counts linked entries', async () => {
  const { token, user } = await register();
  const { rows: [scan] } = await query(
    "INSERT INTO scans (user_id, kind, photo_count) VALUES ($1, 'shelf', 2) RETURNING id", [user.id]);
  await confirm(token, { scanId: scan.id, books: [{ title: 'Dune', author: '' }, { title: 'Circe', author: '' }] });
  const res = await request(app).get('/api/library/scans').set('Authorization', `Bearer ${token}`);
  expect(res.body.scans[0]).toMatchObject({ id: scan.id, books_added: 2 });
});
