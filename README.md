# Sensi World Cup 2026 ⚽

An office World Cup prediction app for the 2026 (48-team) tournament. Rank all 12
groups, fill the full knockout bracket (Round of 32 → Final + Bronze), make daily
match predictions, and climb a points-driven, department-vs-department leaderboard
— with **live scores** wired through a real sports-data provider.

Works on **mobile and desktop** (responsive, touch-first UI).

```
┌──────────────┐     /api/scores      ┌────────────────────┐     x-apisports-key
│   Frontend   │ ───────────────────▶ │   Node backend     │ ──────────────────▶  API-Football
│ React (CDN)  │     /api/me          │ (built-ins only)   │     OIDC + PKCE
│ + adapters   │     /api/roster      │ http · sqlite ·    │ ──────────────────▶  Okta (optional)
│              │     /api/state       │ crypto sessions    │
└──────────────┘                      └────────────────────┘
```

## Quick start

```bash
npm start          # http://localhost:3000   (Node ≥ 22.5, nothing to install)
```

Open http://localhost:3000 and play. With no configuration the app runs in **demo
mode** end-to-end: a server-side ticking live feed, a demo identity, and a sample
office roster. Add credentials (below) to go live — **no code changes**.

```bash
npm test           # 14 tests: unit + full end-to-end league simulation
```

> The core app has **zero runtime dependencies** — it runs entirely on Node
> built-ins (`http`, `node:sqlite`, `crypto`). There is nothing to `npm install`
> and nothing to compile. Okta SSO is the one optional add-on.

## Going live (plug-and-play)

Create `server/.env` from [`server/.env.example`](server/.env.example):

| Capability | What to set | Effect |
|---|---|---|
| **Live scores** | `FOOTBALL_API_KEY` | `/api/scores` switches from the demo feed to real API-Football fixtures (`league=1`, `season=2026`). The key stays server-side. |
| **Okta SSO** *(optional)* | `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET` + `npm install openid-client` (in `server/`) | Real identity + a roster of provisioned users joined with their game stats. |

Detection is automatic: present a key → that integration goes live; leave it blank
→ stays in demo mode.

## How it works

The frontend reads **everything** through two swappable adapters, so the backend
slotted in without any UI changes:

- `scores-provider.js` → `getLiveMatches()` → `GET /api/scores`
- `identity-provider.js` → `getCurrentUser()` / `getRoster()` → `GET /api/me`, `/api/roster`
- `state-sync.js` mirrors the player's bracket/predictions to `GET/PUT /api/state`
  (durable, cross-device) and falls back to `localStorage` if the backend is absent.

The backend normalizes any provider's payload into one schema, holds all secrets,
caches live data to respect rate limits, persists per-user state, enforces pick
locks at kickoff, and grades predictions against real results.

| Area | Highlights |
|---|---|
| **Live scores** | Provider abstraction (API-Football adapter + demo feed), complete 48-team name→code map (accent/variant tolerant), group/status/kickoff normalization, stable IDs, TTL cache as the rate-limit guard. |
| **Identity & roster** | OIDC SSO (Auth Code + PKCE), lazy user provisioning, department→bucket mapping, roster = Okta identities ⟕ game stats. |
| **Persistence** | Built-in SQLite (`node:sqlite`): users, game state, match results. |
| **Scoring** | Projected (committed picks) + graded (vs finished results) — mirrors the prototype's point tiers. |
| **Locks & phase** | Server-authoritative kickoff locks; Pre-Tournament → Matchday lifecycle derived from the live feed or a configured start time. |

## Project layout

```
.
├── Sensi World Cup.html      # app shell (loads React/Tailwind via CDN)
├── *.jsx / *.js              # the prototype: bracket, knockout, predictor, leaderboard…
├── scores-provider.js        # live-scores adapter  → /api/scores
├── identity-provider.js      # identity adapter      → /api/me, /api/roster
├── state-sync.js             # localStorage ⇄ /api/state (additive, fail-safe)
├── server/                   # zero-dependency Node backend  (see server/README.md)
│   ├── index.js  config.js  data.js  scoring.js
│   ├── scores/   identity/   db/   lib/   routes/   test/
│   └── .env.example
└── docs/HANDOFF.md           # original integration spec
```

Backend details, endpoints, and provider-swap instructions: **[server/README.md](server/README.md)**.

## Status

Built and tested: group ranking, knockout bracket, daily predictor, leaderboard,
live-scores integration (demo + real provider paths), persistence, scoring/grading,
server-enforced locks, and phase lifecycle. **Okta SSO is the one integration that
needs your tenant's credentials to activate** — everything else runs out of the box.

## License

[MIT](LICENSE)
