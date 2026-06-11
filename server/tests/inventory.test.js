jest.mock('../src/services/openlibrary', () => {
  const enrichBook = jest.fn(async (b) => ({ ...b, coverUrl: null, openlibraryKey: null }));
  return { enrichBook, enrichAll: jest.fn(async (books) => Promise.all(books.map(enrichBook))) };
});
const request = require('supertest');
const { app, pool, resetDb, register, registerBusiness } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const asBiz = async () => (await registerBusiness()).token;
const post = (path, token, body) =>
  request(app).post(`/api/inventory${path}`).set('Authorization', `Bearer ${token}`).send(body);

test('reader gets 403 on inventory routes', async () => {
  const { token } = await register();
  expect((await post('/confirm', token, { books: [{ title: 'X' }] })).status).toBe(403);
});

test('confirm merges books into inventory; re-confirm does not duplicate', async () => {
  const token = await asBiz();
  await post('/confirm', token, { books: [{ title: 'Dune', author: 'Frank Herbert' }] });
  await post('/confirm', token, { books: [{ title: 'Dune', author: 'Frank Herbert' }, { title: 'Circe', author: '' }] });
  const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.items).toHaveLength(2);
  expect(res.body.items.every((i) => i.in_stock)).toBe(true);
});

test('preview splits detected titles into new vs already-stocked (fuzzy)', async () => {
  const token = await asBiz();
  await post('/confirm', token, { books: [{ title: 'The Name of the Wind', author: '' }] });
  const res = await post('/preview', token, {
    books: [
      { title: 'Name of the Wind', author: '' },
      { title: 'Hyperion', author: 'Dan Simmons' },
    ],
  });
  expect(res.status).toBe(200);
  expect(res.body.existing.map((b) => b.title)).toEqual(['Name of the Wind']);
  expect(res.body.newBooks.map((b) => b.title)).toEqual(['Hyperion']);
});

test('preview is scoped to own inventory', async () => {
  const tokenA = await asBiz();
  const tokenB = await asBiz();
  await post('/confirm', tokenA, { books: [{ title: 'Dune', author: '' }] });
  const res = await post('/preview', tokenB, { books: [{ title: 'Dune', author: '' }] });
  expect(res.body.newBooks.map((b) => b.title)).toEqual(['Dune']);
  expect(res.body.existing).toEqual([]);
});

test('toggle stock flips in_stock and re-confirm restores it', async () => {
  const token = await asBiz();
  await post('/confirm', token, { books: [{ title: 'Dune', author: '' }] });
  const inv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  const bookId = inv.body.items[0].book_id;
  const res = await request(app).patch(`/api/inventory/${bookId}`)
    .set('Authorization', `Bearer ${token}`).send({ inStock: false });
  expect(res.status).toBe(200);
  expect(res.body.item.in_stock).toBe(false);
  await post('/confirm', token, { books: [{ title: 'Dune', author: '' }] });
  const after = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  expect(after.body.items[0].in_stock).toBe(true);
});

test('toggle rejects bad ids, foreign books, and non-boolean payloads', async () => {
  const token = await asBiz();
  expect((await request(app).patch('/api/inventory/abc')
    .set('Authorization', `Bearer ${token}`).send({ inStock: true })).status).toBe(400);
  expect((await request(app).patch('/api/inventory/9999')
    .set('Authorization', `Bearer ${token}`).send({ inStock: true })).status).toBe(404);
  await post('/confirm', token, { books: [{ title: 'Dune', author: '' }] });
  const inv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  expect((await request(app).patch(`/api/inventory/${inv.body.items[0].book_id}`)
    .set('Authorization', `Bearer ${token}`).send({ inStock: 'yes' })).status).toBe(400);
});

test('confirm with fuzzy-existing title reuses stocked book instead of duplicating', async () => {
  const token = await asBiz();
  await post('/confirm', token, { books: [{ title: 'The Name of the Wind', author: '' }] });
  await post('/confirm', token, { books: [{ title: 'Name of the Wind', author: '' }] });
  const res = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  expect(res.body.items).toHaveLength(1);
  expect(res.body.items[0].title).toBe('The Name of the Wind');
});

test('preview rejects empty books payload', async () => {
  const token = await asBiz();
  expect((await post('/preview', token, { books: [] })).status).toBe(400);
  expect((await post('/preview', token, {})).status).toBe(400);
});
