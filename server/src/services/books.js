const { query } = require('../db');

function sanitizeBooks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b) => b && typeof b.title === 'string' && b.title.trim())
    .slice(0, 100)
    .map((b) => ({
      title: b.title.trim().slice(0, 300),
      author: typeof b.author === 'string' ? b.author.trim().slice(0, 200) : '',
    }));
}

async function upsertBook({ title, author, coverUrl = null, openlibraryKey = null }) {
  const { rows } = await query(
    `INSERT INTO books (title, author, cover_url, openlibrary_key)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (title, author)
     DO UPDATE SET cover_url = COALESCE(books.cover_url, EXCLUDED.cover_url)
     RETURNING *`,
    [title, author || '', coverUrl, openlibraryKey]
  );
  return rows[0];
}

module.exports = { sanitizeBooks, upsertBook };
