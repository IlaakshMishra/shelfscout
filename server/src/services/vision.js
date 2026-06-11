const OpenAI = require('openai');
const config = require('../config');

let client;
const getClient = () => {
  if (!client) client = new OpenAI({ apiKey: config.openaiKey, timeout: 30000, maxRetries: 1 });
  return client;
};

function parseModelJson(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    return parsed;
  } catch {
    const err = new Error('AI response could not be parsed');
    err.status = 502;
    throw err;
  }
}

const cleanBooks = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((b) => b && typeof b.title === 'string' && b.title.trim())
    .map((b) => ({
      title: b.title.trim().slice(0, 300),
      author: typeof b.author === 'string' ? b.author.trim().slice(0, 200) : '',
    }));

const EXTRACT_PROMPT =
  'These photos show book spines on a shelf. Identify every book whose title you can ' +
  'actually read. Do not guess unreadable spines. Return JSON exactly as ' +
  '{"books":[{"title":"...","author":"..."}]} — author empty string if not visible.';

async function extractTitles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const content = [
    { type: 'text', text: EXTRACT_PROMPT },
    ...files.map((f) => ({
      type: 'image_url',
      image_url: { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}` },
    })),
  ];
  const res = await getClient().chat.completions.create({
    model: config.openaiModel,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });
  return cleanBooks(parseModelJson(res.choices?.[0]?.message?.content ?? null).books);
}

async function getRecommendationsAndMood(libraryBooks) {
  if (!Array.isArray(libraryBooks) || libraryBooks.length === 0) {
    const err = new Error('libraryBooks required');
    err.status = 400;
    throw err;
  }
  const shelf = libraryBooks
    .map((b) => (b.author ? `${b.title} — ${b.author}` : b.title))
    .join('\n');
  const prompt =
    `A reader's bookshelf:\n${shelf}\n\n` +
    'Return JSON exactly as {"recommendations":[{"title":"...","author":"...","reason":"one sentence"}],' +
    '"mood":{"profileName":"two-word reading persona","summary":"2-3 sentence personality read of this shelf",' +
    '"tags":["mood word", "..."]}} with 8 recommendations of real books NOT on the shelf and 4-6 mood tags.';
  const res = await getClient().chat.completions.create({
    model: config.openaiModel,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });
  const parsed = parseModelJson(res.choices?.[0]?.message?.content ?? null);

  // Fix: attach reason before filtering so index alignment is preserved even
  // if cleanBooks drops junk entries. Filter and map in one pass over the raw
  // parsed list so each entry's reason travels with its title/author.
  const rawRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const recommendations = rawRecs
    .filter((b) => b && typeof b.title === 'string' && b.title.trim())
    .map((b) => ({
      title: b.title.trim().slice(0, 300),
      author: typeof b.author === 'string' ? b.author.trim().slice(0, 200) : '',
      reason: String(b.reason || '').slice(0, 400),
    }));

  return {
    recommendations,
    mood: {
      profileName: String(parsed.mood?.profileName || 'Eclectic Reader').slice(0, 80),
      summary: String(parsed.mood?.summary || '').slice(0, 600),
      tags: (Array.isArray(parsed.mood?.tags) ? parsed.mood.tags : [])
        .slice(0, 6).map((t) => String(t).slice(0, 30)),
    },
  };
}

module.exports = { extractTitles, getRecommendationsAndMood };
