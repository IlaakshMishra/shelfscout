const { enrichBook } = require('../src/services/openlibrary');

afterEach(() => { delete global.fetch; });

test('enriches with cover and author from first doc', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ docs: [{ title: 'Dune', author_name: ['Frank Herbert'], cover_i: 11481354, key: '/works/OL893415W' }] }),
  }));
  const out = await enrichBook({ title: 'Dune', author: '' });
  expect(out).toEqual({
    title: 'Dune', author: 'Frank Herbert',
    coverUrl: 'https://covers.openlibrary.org/b/id/11481354-M.jpg',
    openlibraryKey: '/works/OL893415W',
  });
});

test('falls back gracefully on no match or network error', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ docs: [] }) }));
  expect(await enrichBook({ title: 'Zzz Unknown', author: 'X' }))
    .toEqual({ title: 'Zzz Unknown', author: 'X', coverUrl: null, openlibraryKey: null });
  global.fetch = jest.fn(async () => { throw new Error('boom'); });
  expect((await enrichBook({ title: 'A', author: '' })).coverUrl).toBeNull();
});
