async function enrichBook({ title, author }) {
  const fallback = { title, author: author || '', coverUrl: null, openlibraryKey: null };
  try {
    const params = new URLSearchParams({ title, limit: '1', fields: 'title,author_name,cover_i,key' });
    if (author) params.set('author', author);
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return fallback;
    const doc = (await res.json()).docs?.[0];
    if (!doc) return fallback;
    return {
      title,
      author: author || doc.author_name?.[0] || '',
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      openlibraryKey: doc.key || null,
    };
  } catch {
    return fallback;
  }
}

const CONCURRENCY = 5;

async function enrichAll(books) {
  const out = [];
  for (let i = 0; i < books.length; i += CONCURRENCY) {
    out.push(...(await Promise.all(books.slice(i, i + CONCURRENCY).map(enrichBook))));
  }
  return out;
}

module.exports = { enrichBook, enrichAll };
