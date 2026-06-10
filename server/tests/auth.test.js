const request = require('supertest');
const { app, pool, resetDb, register, registerBusiness } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  test('registers a reader and returns token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', role: 'reader' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: 'a@b.com', role: 'reader' });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'short', role: 'reader' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid email and invalid role', async () => {
    expect((await request(app).post('/api/auth/register')
      .send({ email: 'nope', password: 'password123', role: 'reader' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123', role: 'admin' })).status).toBe(400);
  });

  test('business requires storeName', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'shop@b.com', password: 'password123', role: 'business' });
    expect(res.status).toBe(400);
  });

  test('duplicate email returns 409', async () => {
    await register({ email: 'dup@b.com' });
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'dup@b.com', password: 'password123', role: 'reader' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('valid credentials return token', async () => {
    await register({ email: 'me@b.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'me@b.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('wrong password returns 401 with generic message', async () => {
    await register({ email: 'me@b.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'me@b.com', password: 'wrong-pass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('unknown email returns same 401 (no user enumeration)', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'ghost@b.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});
