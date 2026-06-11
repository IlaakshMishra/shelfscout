# ShelfScout

Photograph a bookshelf. ShelfScout reads the spines, builds your digital library,
profiles your reading mood, and recommends books — flagging which local bookstores
have them in stock. Bookstores keep their public inventory current the same way:
by photographing their shelves.

## Features

**For readers**
- Scan a shelf (up to 2 photos) — gpt-4o-mini reads the spines
- Editable review step: AI output is never saved without human confirmation
- Personal library with covers/authors enriched from Open Library
- AI recommendations with one-line reasons + "Available at [store]" badges
- Reading-mood profile: a two-word persona, summary, and mood tags
- Scan history

**For bookstores**
- Same scan flow updates inventory: diff preview shows NEW vs already-stocked;
  existing stock is never silently removed
- One-tap in-stock / sold-out toggles
- Public store page readers can browse
- Cross-store title search brings readers to you

## Stack

- **Frontend:** Expo + react-native-web (JS), web target
- **Backend:** Node/Express
- **Database:** PostgreSQL (pg_trgm for fuzzy title matching)
- **AI:** OpenAI gpt-4o-mini (vision + recommendations), Open Library (metadata)

## Setup

```bash
# Postgres
createdb shelfscout && createdb shelfscout_test
# Note: Homebrew installs (postgresql@16) may need /opt/homebrew/opt/postgresql@16/bin on PATH.

# Server
cd server
cp .env.example .env   # set JWT_SECRET (long random string) + OPENAI_API_KEY
npm install
npm run db:init && npm run db:init:test
npm run seed           # demo accounts below
npm run dev            # http://localhost:4000

# App (new terminal)
cd app
npm install
npx expo start --web   # http://localhost:8081
```

**Demo accounts** (password `demo-pass-123`): `reader@demo.com`,
`dustypage@demo.com` (The Dusty Page), `riverside@demo.com` (Riverside Reads).

## Tests

```bash
cd server && npm test   # 55 supertest API tests
cd app && npm test      # 6 RNTL component tests (review + auth screens)
```

Security and architecture details: see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).
