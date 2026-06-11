jest.mock('../src/services/vision', () => ({
  extractTitles: jest.fn(async () => [{ title: 'Dune', author: 'Frank Herbert' }]),
}));
const request = require('supertest');
const { app, pool, query, resetDb, register, TINY_PNG } = require('./helpers');
const { extractTitles } = require('../src/services/vision');

beforeEach(async () => { await resetDb(); extractTitles.mockClear(); });
afterAll(() => pool.end());

test('rejects unauthenticated scan', async () => {
  const res = await request(app).post('/api/scan').attach('photos', TINY_PNG, 'shelf.png');
  expect(res.status).toBe(401);
});

test('accepts 1-2 photos, returns books, records scan, keeps no files', async () => {
  const { token } = await register();
  const res = await request(app).post('/api/scan')
    .set('Authorization', `Bearer ${token}`)
    .attach('photos', TINY_PNG, 'a.png')
    .attach('photos', TINY_PNG, 'b.png');
  expect(res.status).toBe(200);
  expect(res.body.books).toEqual([{ title: 'Dune', author: 'Frank Herbert' }]);
  expect(res.body.scanId).toBeTruthy();
  const { rows } = await query('SELECT * FROM scans');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ kind: 'shelf', photo_count: 2 });
});

test('rejects 3 photos with clear error', async () => {
  const { token } = await register();
  const res = await request(app).post('/api/scan')
    .set('Authorization', `Bearer ${token}`)
    .attach('photos', TINY_PNG, 'a.png')
    .attach('photos', TINY_PNG, 'b.png')
    .attach('photos', TINY_PNG, 'c.png');
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Maximum 2 photos per scan');
});

test('rejects zero photos and non-image files', async () => {
  const { token } = await register();
  expect((await request(app).post('/api/scan')
    .set('Authorization', `Bearer ${token}`)).status).toBe(400);
  const res = await request(app).post('/api/scan')
    .set('Authorization', `Bearer ${token}`)
    .attach('photos', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Only JPEG, PNG or WebP images are accepted');
});

test('business with ?kind=store records store scan', async () => {
  const { registerBusiness } = require('./helpers');
  const { token } = await registerBusiness();
  const res = await request(app).post('/api/scan?kind=store')
    .set('Authorization', `Bearer ${token}`)
    .attach('photos', TINY_PNG, 'shop.png');
  expect(res.status).toBe(200);
  const { rows } = await query('SELECT kind FROM scans');
  expect(rows[0].kind).toBe('store');
});
