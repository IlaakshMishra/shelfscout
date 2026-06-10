const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/db');

async function resetDb() {
  await query('TRUNCATE users, books, scans, library_entries, inventory RESTART IDENTITY CASCADE');
}

let counter = 0;
async function register(overrides = {}) {
  counter += 1;
  const body = {
    email: `user${counter}-${Date.now()}@test.com`,
    password: 'password123',
    role: 'reader',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register helper failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user };
}

const registerBusiness = (overrides = {}) =>
  register({ role: 'business', storeName: 'Test Books', ...overrides });

// 1x1 transparent PNG for upload tests
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

module.exports = { app, pool, query, resetDb, register, registerBusiness, TINY_PNG };
