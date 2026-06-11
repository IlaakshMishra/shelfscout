jest.mock('../src/services/openlibrary', () => ({
  enrichBook: jest.fn(async (b) => ({ ...b, coverUrl: 'http://cover/x.jpg', openlibraryKey: '/works/X' })),
}));
const request = require('supertest');
const { app, pool, resetDb, register } = require('./helpers');

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
