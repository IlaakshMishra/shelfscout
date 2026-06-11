jest.mock('../src/services/openlibrary', () => {
  const enrichBook = jest.fn(async (b) => ({ ...b, coverUrl: null, openlibraryKey: null }));
  return { enrichBook, enrichAll: jest.fn(async (books) => Promise.all(books.map(enrichBook))) };
});
const request = require('supertest');
const { app, pool, resetDb, registerBusiness } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

async function seedStore(name, titles) {
  const { token, user } = await registerBusiness({ storeName: name });
  await request(app).post('/api/inventory/confirm').set('Authorization', `Bearer ${token}`)
    .send({ books: titles.map((t) => ({ title: t, author: '' })) });
  return { user, token };
}

test('GET /api/stores lists businesses with stock counts (no auth needed)', async () => {
  await seedStore('The Dusty Page', ['Dune', 'Circe']);
  await seedStore('Riverside Reads', ['Hyperion']);
  const res = await request(app).get('/api/stores');
  expect(res.status).toBe(200);
  expect(res.body.stores).toHaveLength(2);
  const dusty = res.body.stores.find((s) => s.store_name === 'The Dusty Page');
  expect(dusty.in_stock_count).toBe(2);
  expect(dusty.email).toBeUndefined();
});

test('GET /api/stores/:id returns store with in-stock inventory only', async () => {
  const { user, token } = await seedStore('The Dusty Page', ['Dune', 'Circe']);
  // toggle Circe out of stock
  const inv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  const circe = inv.body.items.find((i) => i.title === 'Circe');
  await request(app).patch(`/api/inventory/${circe.book_id}`)
    .set('Authorization', `Bearer ${token}`).send({ inStock: false });

  const res = await request(app).get(`/api/stores/${user.id}`);
  expect(res.status).toBe(200);
  expect(res.body.store.store_name).toBe('The Dusty Page');
  expect(res.body.books.map((b) => b.title)).toEqual(['Dune']);
  expect((await request(app).get('/api/stores/99999')).status).toBe(404);
  expect((await request(app).get('/api/stores/abc')).status).toBe(400);
});

test('GET /api/search finds titles across stores, rejects short queries', async () => {
  await seedStore('The Dusty Page', ['The Name of the Wind']);
  expect((await request(app).get('/api/search?q=a')).status).toBe(400);
  const res = await request(app).get('/api/search?q=name of the wind');
  expect(res.status).toBe(200);
  expect(res.body.results[0]).toMatchObject({
    title: 'The Name of the Wind', store_name: 'The Dusty Page',
  });
});

test('search fuzzy branch matches typo queries', async () => {
  await seedStore('The Dusty Page', ['The Name of the Wind']);
  const res = await request(app).get('/api/search?q=' + encodeURIComponent('name of teh wind'));
  expect(res.status).toBe(200);
  expect(res.body.results.map((r) => r.title)).toContain('The Name of the Wind');
});

test('store with empty inventory still listed with zero count', async () => {
  await registerBusiness({ storeName: 'Empty Shelf Co' });
  const res = await request(app).get('/api/stores');
  const empty = res.body.stores.find((s) => s.store_name === 'Empty Shelf Co');
  expect(empty.in_stock_count).toBe(0);
});

test('search does not return out-of-stock or unrelated titles', async () => {
  const { user, token } = await seedStore('The Dusty Page', ['Dune', 'Hyperion']);
  const inv = await request(app).get('/api/inventory').set('Authorization', `Bearer ${token}`);
  const dune = inv.body.items.find((i) => i.title === 'Dune');
  await request(app).patch(`/api/inventory/${dune.book_id}`)
    .set('Authorization', `Bearer ${token}`).send({ inStock: false });

  const res = await request(app).get('/api/search?q=dune');
  expect(res.body.results).toEqual([]);
});
