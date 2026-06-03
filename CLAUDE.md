# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from repo root via `make`, which reads `backend/.env` for DB credentials.

```bash
make install      # npm install in backend/
make dev          # nodemon (hot reload)
make start        # node (production)
make db-reset     # drop + recreate schema + seed (destructive)
make db-seed      # seed only
make db-dump      # dump to backend/db/dump.sql
make mysql        # open MySQL shell
```

No test runner is configured. No lint script in package.json — ESLint config exists in `.eslintrc.json` but must be run directly: `cd backend && npx eslint <file>`.

## Environment

Copy `backend/.env.example` to `backend/.env`. Required vars:

- `TMDB_API_KEY` — bearer token for TMDB v3 API
- `OMDB_API_KEY` — query param key for OMDB
- `COOKIE_SECRET` — express-session secret
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `APP_PORT` — host port (container always binds 8080 internally)
- `NODE_ENV` — `dev` enables error stack traces in the error view

Dev container is available via `.devcontainer/` for VS Code.

## Architecture

**Frontend** — static HTML/CSS/Vue.js files in `frontend/`. Served directly by Express (`express.static`). Direct `.html` URL access is blocked by middleware (403); all page navigation must go through Express routes defined in `backend/routes/index.js`. Frontend JS uses ES6 modules.

**Backend** — Express app in `backend/app.js`. All API routes are prefixed `/api/`. Session store uses the same MySQL pool (`express-mysql-session`), persisting to the `SESSIONS` table. Passport.js local strategy handles auth (`services/local-strategy.js`).

**Database** — MySQL. Schema in `backend/db/schema.sql`, views in `views.sql`, seed data in `seed.sql`. `db-reset` runs all three in order. The `PREFERENCES` table is a static lookup of 8 rows mapping `(is_liked BOOL, watch_status 0–3)` combos to IDs — don't add rows, just reference it.

**Movie data flow** — Movies are fetched from TMDB/OMDB and cached locally in the `MOVIES` table on first access via `helpers.insertMovie()`. Subsequent reads hit the local DB. Watch providers and genres have their own junction tables (`MOVIEPROVIDERS`, `MOVIEGENRES`).

**Recommendation algorithm** (`services/algo.js` + `services/algo-mapping.js`):
- Each user has a float vector stored as JSON in `USERSETTINGS.user_vector`
- Each movie is encoded into a same-dimension vector (genres, language, decade, IMDb rating, watch providers, user rating)
- `calculateScore()` computes cosine similarity between movie vector and user vector
- On swipe (`POST /api/personalise/movie`), the score is stored in `USERPREFERENCES.score`, and the user vector is updated with a learning rate (like: `ALPHA_LIKE`, dislike: `ALPHA_DISLIKE`) plus decay (`DECAY_GAMMA`)
- `GET /api/personalise/movies` picks the highest-scored movie, fetches TMDB recommendations for it, filters out already-seen movies, and returns IDs

**Auth middleware** — `isAuthenticated` and `isAdmin` live in `services/validators.js` and are applied per-router. All `/api/personalise` and `/api/mylist` routes require authentication. `/api/admin` requires admin role.

**File uploads** — Profile pictures use `multer` and are stored in `backend/uploads/`. Served at `/uploads/`.
