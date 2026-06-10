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
