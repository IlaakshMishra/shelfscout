jest.mock('openai', () => {
  const create = jest.fn();
  const MockOpenAI = jest.fn(() => ({ chat: { completions: { create } } }));
  MockOpenAI.__create = create;
  return MockOpenAI;
});
const OpenAI = require('openai');
const { extractTitles, getRecommendationsAndMood } = require('../src/services/vision');

const reply = (obj) => ({ choices: [{ message: { content: JSON.stringify(obj) } }] });

test('extractTitles parses, trims, and drops junk entries', async () => {
  OpenAI.__create.mockResolvedValueOnce(reply({
    books: [
      { title: '  Dune ', author: 'Frank Herbert' },
      { title: '', author: 'x' },
      { title: 'Untitled Memoir' },
      null,
    ],
  }));
  const out = await extractTitles([{ mimetype: 'image/png', buffer: Buffer.from('x') }]);
  expect(out).toEqual([
    { title: 'Dune', author: 'Frank Herbert' },
    { title: 'Untitled Memoir', author: '' },
  ]);
  const call = OpenAI.__create.mock.calls[0][0];
  expect(call.response_format).toEqual({ type: 'json_object' });
  expect(call.messages[0].content.filter((c) => c.type === 'image_url')).toHaveLength(1);
});

test('getRecommendationsAndMood returns recs and mood', async () => {
  OpenAI.__create.mockResolvedValueOnce(reply({
    recommendations: [{ title: 'Hyperion', author: 'Dan Simmons', reason: 'Epic sci-fi like Dune' }],
    mood: { profileName: 'Cosmic Wanderer', summary: 'Drawn to vast worlds.', tags: ['epic', 'curious'] },
  }));
  const out = await getRecommendationsAndMood([{ title: 'Dune', author: 'Frank Herbert' }]);
  expect(out.recommendations[0].title).toBe('Hyperion');
  expect(out.mood.profileName).toBe('Cosmic Wanderer');
});

beforeEach(() => OpenAI.__create.mockClear());

test('extractTitles returns [] for empty or missing files without calling API', async () => {
  expect(await extractTitles([])).toEqual([]);
  expect(await extractTitles(undefined)).toEqual([]);
  expect(OpenAI.__create).not.toHaveBeenCalled();
});

test('unparseable model output throws 502-tagged error', async () => {
  OpenAI.__create.mockResolvedValueOnce({ choices: [{ message: { content: 'not json{{' } }] });
  await expect(extractTitles([{ mimetype: 'image/png', buffer: Buffer.from('x') }]))
    .rejects.toMatchObject({ status: 502 });
});

test('clamps oversized fields and caps tags', async () => {
  OpenAI.__create.mockResolvedValueOnce(reply({
    recommendations: [{ title: 'T'.repeat(400), author: 'A'.repeat(300), reason: 'R'.repeat(500) }],
    mood: { profileName: 'P'.repeat(100), summary: 'S'.repeat(700), tags: ['a','b','c','d','e','f','g','h'] },
  }));
  const out = await getRecommendationsAndMood([{ title: 'Dune', author: '' }]);
  expect(out.recommendations[0].title).toHaveLength(300);
  expect(out.recommendations[0].author).toHaveLength(200);
  expect(out.recommendations[0].reason).toHaveLength(400);
  expect(out.mood.profileName).toHaveLength(80);
  expect(out.mood.summary).toHaveLength(600);
  expect(out.mood.tags).toHaveLength(6);
});

test('empty libraryBooks throws 400-tagged error', async () => {
  await expect(getRecommendationsAndMood([])).rejects.toMatchObject({ status: 400 });
});
