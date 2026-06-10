const request = require('supertest');
const app = require('../src/app');

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});

test('unknown route returns JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Not found');
});

test('malformed JSON body returns 400, not 500', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{bad json');
  expect(res.status).toBe(400);
});
