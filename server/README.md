# Sensi World Cup 2026 — Backend

Turns the high-fidelity prototype into a running product. The backend serves the
existing frontend **unchanged** and implements the endpoints the two adapters
(`scores-provider.js`, `identity-provider.js`) already expect.

Design goal: **plug-and-play**. With no configuration at all, everything runs in
demo mode. Add an API key → live scores. Add Okta env → real SSO. No code changes.

## Quick start

The core app has **zero runtime dependencies** (Node built-ins only) — nothing to
install, nothing to compile.

```bash
# from the repo root
npm start                   # http://localhost:3000   (Node >= 22.5)

# or from this folder
cd server && node index.js
```

`cp .env.example .env` is optional — without it the server runs fully in demo mode.
Open http://localhost:3000; the app polls `/api/scores` and shows a "demo feed" pill
until you add a provider key.

```bash
npm test                         # unit + end-to-end league simulation (14 tests)
curl localhost:3000/api/health   # shows which integrations are live vs demo
```

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/scores` | Live matches in the normalized schema `{ matches, updatedAt, mode }`. Cached (`SCORES_CACHE_TTL_MS`) as the rate-limit guard. |
| GET | `/api/me` | Signed-in `User { id, name, email, dept, you:true }` (demo user until Okta is configured). |
| GET | `/api/roster` | `{ players, departments }` — Okta identities **joined** with game stats from the DB. Demo roster otherwise. |
| GET / PUT | `/api/state` | Per-user bracket/predictions persistence. PUT enforces kickoff locks server-side. |
| GET | `/api/phase` | Derived Pre-Tournament → Matchday lifecycle. |
| GET | `/auth/login` `/auth/callback` `/auth/logout` | OIDC SSO flow (Okta). |
| GET | `/api/health` | Status + which integrations are live vs demo. |

## Going live

### Live scores (API-Football)
Set `FOOTBALL_API_KEY` in `.env`. The scores layer switches from the demo feed to
the real `v3.football.api-sports.io` `/fixtures` endpoint automatically
(`league=1`, `season=2026`). The key stays server-side and never reaches the
browser. Provider team names are mapped to the app's 3-letter codes in
`scores/teamMap.js` (all 48 teams, tolerant of accents/variants); group labels and
statuses are normalized in `scores/normalize.js`.

Swapping providers (football-data.org, SportMonks) = add one file under
`scores/providers/` exposing `getMatches()` and point `scores/index.js` at it.

### Okta SSO + roster (optional add-on)
Okta is the one integration with a third-party dependency. Enable it with:

```bash
cd server && npm install openid-client
```

Then set `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET` (and redirect URIs). The
app uses Authorization Code + PKCE. Users are **lazily provisioned** into the DB on
first login; the department comes from the `OKTA_DEPT_CLAIM` profile attribute (or
`groups`) and is normalized into the six leaderboard buckets in `data.js`.
To pull the full org up front instead, add a scheduled Okta Users/Groups API
sync that calls `upsertUser()` — the roster join already handles it.

### Persistence
`game_state` (rankings, koPicks, predState) and `match_results` live in SQLite
(`DB_FILE`). The frontend's `state-sync.js` mirrors localStorage to `/api/state`
(write-through + hydrate-on-load) and fails safe to localStorage if the backend is
absent. For production, point `express-session` at a persistent store (Redis/SQLite).

### Scoring & locks
`scoring.js` mirrors the prototype's point tiers and produces both a **projected**
total (committed picks) and a **graded** total (matchday picks scored against
finished results ingested from the feed). PUT `/api/state` rejects edits to matches
that have kicked off and to group rankings once the tournament starts — the server
is authoritative, not the UI.

## Architecture

```
server/
  index.js              http app: static frontend + API + sessions
  config.js             env loading + feature detection (demo vs live)
  data.js               group keys, departments, demo roster, dept mapping
  scoring.js            projected + graded scoring (mirrors frontend tiers)
  scores/
    index.js            cache + provider selection
    teamMap.js          48-team provider-name -> 3-letter code
    normalize.js        group / status / kickoff normalization
    providers/
      apiFootball.js    real provider adapter (holds the key)
      demo.js           server-side ticking demo feed
  identity/
    okta.js             OIDC client (Auth Code + PKCE) — optional
    roster.js           Okta identities ⟕ game stats
    routes.js           /api/me, /api/roster, /auth/*
  db/
    db.js               node:sqlite schema + transaction helper
    repo.js             data access (users, state, results, locks)
  lib/
    server.js           tiny zero-dep http framework (routing, sessions, static)
    koTree.js           KO round membership for scoring
    phase.js            tournament-started derivation
  routes/api.js         /api/scores, /api/state, /api/phase, /api/health
  test/
    scores.test.js      unit tests (team map, normalization, scoring)
    e2e.test.js         boots the server + simulates a multi-user league
```

## Notes
- **Node ≥ 22.5** (uses built-in `node:sqlite` and global `fetch`). Verified on Node 22.22.
- Zero runtime dependencies for the core; `openid-client` is an optional dependency
  used only when Okta is enabled.
- Same-origin: the API and the static app are served together, so cookies and
  `/api/*` calls work with no CORS setup.
- WAL journaling is best-effort — it falls back automatically on filesystems that
  don't support it (some network/overlay mounts).
