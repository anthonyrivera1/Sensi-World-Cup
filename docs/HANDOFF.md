# Handoff: Sensi World Cup 2026 — Live Scores Integration

## Overview
Sensi World Cup is an interactive **office World Cup prediction app** (2026, 48-team format) built as a working
React prototype in plain HTML + Babel + Tailwind (CDN). Users rank all 12 groups, fill a full knockout bracket
(Round of 32 → Final + Bronze), make daily match predictions, and compete on a points-driven leaderboard.

**This handoff is specifically about wiring up REAL live scores.** The app already reads all live data through a
single swappable adapter; today that adapter is mock-backed. The task is to stand up a small backend that fetches
from a real sports-data provider and serve it to the existing adapter — **no UI changes required.**

## About the design files
The files in this bundle are a **working design reference** created in HTML/React (CDN Babel). They show the
intended look and behavior. Depending on your goal you can either:
- **Run/extend them directly** (they are already functional React), or
- **Recreate them in your target codebase** (Next.js, Vite + React, etc.) using your established patterns.

Either way, the **live-scores contract below is the important part** — it is framework-agnostic.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, interactions, and animations are all in place. Treat the
visuals as the spec.

---

# THE IMMEDIATE TASK — Live scores

## 1. The data contract (do not change the shape)
Every match the app renders uses this **normalized schema** (see `scores-provider.js`):

```ts
type Match = {
  id:      string;                         // stable match id
  group:   string;                         // 'A'..'L'
  home:    string;                         // 3-letter team code (see TEAMS in data.js)
  away:    string;                         // 3-letter team code
  venue:   string;
  kickoff: string;                         // 'HH:MM' Eastern Time
  status:  'upcoming' | 'live' | 'finished';
  min:     number;                         // live minute (0 if not started)
  score:   [number, number];               // [homeGoals, awayGoals]
};
```

The adapter entrypoint resolves to:
```ts
getLiveMatches(): Promise<{ matches: Match[]; updatedAt: number /* ms epoch */ }>
```

## 2. Flip the adapter to the real feed
In `scores-provider.js`:
```js
const SCORES_MODE = 'api';          // was 'mock'
const SCORES_API_URL = '/api/scores';
```
The `'api'` branch already does `fetch('/api/scores')` and expects `{ matches, updatedAt }` in the schema above.
**That is the only frontend change.**

## 3. Build the backend `/api/scores` (holds the secret key)
The provider key must NEVER ship to the browser. Implement a server route/function that:
1. Calls a sports-data provider with the key from an env var.
2. Maps the provider's payload into the **normalized schema**.
3. Caches the result (live data changes ~every 15–30s; respect provider rate limits).
4. Returns `{ matches: Match[], updatedAt: Date.now() }`.

### Provider options
- **API-Football (api-sports.io)** — rich live data, generous free tier. Fixtures endpoint returns live minute & goals.
- **football-data.org** — simpler, free tier, good for fixtures/scores.
- **SportMonks** — paid, very complete.

### Example (Vercel/Next.js route handler — adapt to your stack)
```js
// app/api/scores/route.js   (or pages/api/scores.js)
export const revalidate = 0;

// provider team name -> your 3-letter code (extend to all 48; codes live in data.js TEAMS)
const CODE = { Germany: 'GER', Brazil: 'BRA', France: 'FRA', /* ...48 teams... */ };
const VENUE = { /* fixtureId or stadium -> display venue, optional */ };

export async function GET() {
  const r = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026&live=all', {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
    // cache for ~15s to stay under rate limits
    next: { revalidate: 15 },
  });
  const data = await r.json();

  const matches = data.response.map((f) => ({
    id:      String(f.fixture.id),
    group:   f.league.round?.replace(/[^A-L]/g, '') || '',     // map round -> group letter
    home:    CODE[f.teams.home.name] ?? f.teams.home.name.slice(0, 3).toUpperCase(),
    away:    CODE[f.teams.away.name] ?? f.teams.away.name.slice(0, 3).toUpperCase(),
    venue:   f.fixture.venue?.city ?? '',
    kickoff: new Date(f.fixture.date).toLocaleTimeString('en-US',
               { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', hour12: false }),
    status:  f.fixture.status.short === 'NS' ? 'upcoming'
           : ['1H','2H','HT','ET','P'].includes(f.fixture.status.short) ? 'live' : 'finished',
    min:     f.fixture.status.elapsed ?? 0,
    score:   [f.goals.home ?? 0, f.goals.away ?? 0],
  }));

  return Response.json({ matches, updatedAt: Date.now() });
}
```

### Critical mapping work
- **Team codes**: the app keys everything off the 3-letter codes in `data.js` → `TEAMS`. Build a complete
  `providerTeamName → code` map for all 48 teams (the codes are MEX, RSA, KOR, … see `data.js`). Flags, bracket
  seeding, and scoring all depend on these codes matching exactly.
- **Group letter**: providers label group fixtures variously ("Group A", "Group Stage - A"). Normalize to a single
  `'A'..'L'` letter — the matchday↔bracket consistency logic uses `match.group`.
- **IDs**: keep them stable across polls so React keys and the user's locked predictions stay attached.

## 4. Polling / freshness (already built on the frontend)
`useLiveScores(intervalMs = 9000)` in `live.jsx` polls the adapter and exposes
`{ matches, byId, updatedAt, loading, error, anyLive, refresh, mode }`. The `<LiveStatus>` pill renders
loading / live / stale (>40s) / error / "demo feed" states. Tune `intervalMs` to your provider's rate limit
(15–30s is typical for live football). Backend caching should be your real rate-limit guard.

## 5. Env & secrets
- `FOOTBALL_API_KEY` (or provider equivalent) in server env only.
- Never expose it in client code or the `scores-provider.js` `'api'` branch.

---

# Pulling users from Okta (identity & roster)

The app reads identity through one adapter — `identity-provider.js` — exposing:
```ts
getCurrentUser(): Promise<User>                              // who is signed in
getRoster():      Promise<{ players: Player[]; departments: string[] }>  // the league
type User   = { id; name; email; dept; you:boolean };
type Player = User & { score; delta; champ; exact; streak };  // identity ⟕ game stats
```
Today it's mock-backed (uses `data.js`). **Going live = set `IDENTITY_MODE = 'okta'`** — the adapter then `fetch`es `/api/me` and `/api/roster` (cookie/session credentials). No UI changes.

### Separation of concerns (important)
- **Okta provides IDENTITY only** — id, name, email, `department`, and the list of employees.
- **Game stats** (score, momentum, exacts, streak, champion pick) are YOUR app's data, computed from predictions and keyed by user id.
- The rendered roster = **Okta identities `⟕` joined with game stats from your DB**.

### Optimal architecture
**Auth — OIDC SSO (Authorization Code + PKCE):**
- Use Okta as an OIDC IdP (Auth.js/next-auth Okta provider, or `@okta/okta-auth-js`). Secrets (issuer, client id/secret, redirect URIs) live server-side.
- Map Okta's `department` profile attribute (or group membership) into a token claim so `/api/me` can return `dept` directly into the app's six buckets (`DEPT_ACCENT`).
- `/api/me` → reads the signed-in session → returns `User{ you:true }`.

**Roster — choose by how complete/synced you need it:**
| Approach | When | How |
|---|---|---|
| **Lazy provisioning** | Launch fast | Create a user row on first SSO login (dept from claim). League grows as people sign in. No admin scope. |
| **SCIM provisioning** | Keep in sync | Okta pushes create/update/deactivate to your SCIM endpoint — auto joiners/leavers. Best long-term. |
| **Okta API pull** | Full org upfront | Backend calls `GET /api/v1/users` + Groups API (departments = Okta groups) with an API token / OAuth-for-Okta (`okta.users.read`), on a schedule. |

**Recommended:** OIDC SSO + lazy provisioning to start, add SCIM once you want the full roster + auto-deprovisioning.

### `/api/roster` responsibility
Return `{ players, departments }` where `players` = each Okta identity joined with that user's game stats (default stats to 0 for users who haven't played). `departments` = the distinct Okta departments/groups you want as leaderboard buckets. Unknown departments fall back to a default accent in the UI.

### Department mapping
The leaderboard buckets and `DEPT_ACCENT` colours key off the `dept` string. Map Okta `profile.department` (or group name) → your bucket labels. Add accents for any new departments in `data.js` → `DEPT_ACCENT` (UI already falls back to `#38bdf8` for unmapped depts).

### Env & secrets (server only)
`OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, redirect URIs; for API-pull also `OKTA_API_TOKEN` (or OAuth-for-Okta creds). Never ship these to the client.

---

# Phase lifecycle (TO IMPLEMENT)
Today the Phase A/B toggle (`Pre-Tournament` / `Matchday`) is a **manual demo switch**. In production it should be **derived from tournament state**, not toggled by hand:
- **Trigger:** the pre-tournament stage is over once the feed reports any match `live`/`finished` (use `useLiveScores().anyLive` / statuses) **or** the current time passes a configurable `TOURNAMENT_START`.
- **On start:** (1) auto-switch the default phase to **Matchday**; (2) **relabel** the `Pre-Tournament` tab to **`Bracket`** (it becomes a read-only view, not an editor); (3) **lock group editing** — `RankingPanel` and the group cards become read-only, and `koPicks` editing closes at each round's kickoff.
- Keep a manual override in non-production builds so both states stay previewable.

# Status — built now vs. real after handoff
**Built & working now (client-side, mock-backed):** group ranking (two-tap, auto-advance), 3rd-place automator, full knockout bracket (R32→Final + Bronze, tap-to-advance), daily predictor (1×2 + optional exact score, bracket-locked outcomes), Virtual Monkey UI, projected scoring engine, live leaderboard (individual + dept-vs-dept, momentum, exact-score streaks, banter), tweaks panel, **local-timezone kickoff times**, and the two swappable adapters (scores, identity) with full live/loading/error states.

| Feature | Now (prototype) | After handoff (backend) |
|---|---|---|
| Live scores | Mock ticking feed | Real provider via `/api/scores` |
| Auth & roster | Mock user + `PLAYERS` | Okta SSO + `/api/me` + `/api/roster` |
| Persistence | `localStorage` (per browser) | Server DB (per-user, shared league) |
| Scoring | **Projected** points (committed picks) | **Graded** vs real results once matches finish |
| Lock enforcement | Client-side (UI prevents edits) | Server-enforced lock at kickoff (authoritative) |
| Virtual Monkey | UI toggle + preview | Server job auto-fills missed locks before kickoff |
| Phase lifecycle | Manual toggle | Auto Pre-Tournament→Matchday + "Bracket" relabel/lock |
| Leaderboard updates | Static rivals + live "You" | Real-time standings for everyone (poll/websocket) |
| Notifications | None | Matchday/lock reminders (email/push) — optional |

# Open product decisions to confirm before/within build
1. **Scoring rules** — confirm point values (group lock, outcome 3 / exact +2, KO tiers, champion +40) and whether upsets/underdogs earn bonuses.
2. **Lock timing** — per-match lock at kickoff vs. a per-matchday lock window; server is the source of truth.
3. **Leaderboard tie-breakers** — equal points → more exact scores? earliest locked? head-to-head?
4. **Bracket cutoff** — exact moment the bracket freezes (final group draw vs. first match kickoff).
5. **3rd-place allocation** — prototype uses a greedy power-based assignment; real FIFA uses an official allocation table. Decide if exact-table fidelity is required.
6. **Virtual Monkey behaviour** — fills outcome only, or exact scores too? deterministic vs. random; who runs it.
7. **Department source** — Okta `profile.department` attribute vs. Okta group membership (pick the canonical one).
8. **Pick privacy** — can colleagues see each other's picks/champion before lock, or only after?

# App architecture (for extending in Claude Code)

| File | Type | Responsibility |
|---|---|---|
| `Sensi World Cup.html` | HTML shell | Loads React/Babel/Tailwind (CDN), design tokens (CSS vars + keyframes), and all modules in order. |
| `data.js` | data | `TEAMS` (48 teams: code, name, flag colors), `GROUPS` (A–L), `TODAY_MATCHES` (fixture seed), `PLAYERS`, `DEPARTMENTS`, `DEPT_ACCENT`. |
| `scores-provider.js` | data adapter | **Live-scores entrypoint.** `getLiveMatches()`, mock + api adapters, normalized schema. Also `localKickoff()` — converts ET kickoff times to the viewer's local timezone. ← integration point |
| `live.jsx` | hook + UI | `useLiveScores()` polling hook, `<LiveStatus>` pill. |
| `identity-provider.js` | data adapter | **Identity/roster entrypoint.** `getCurrentUser()` + `getRoster()`, mock + okta adapters. ← Okta integration point |
| `identity.jsx` | hook | `useIdentity()` — loads current user + roster. |
| `ui.jsx` | primitives | `Icon` (lucide), `FlagChip` (CSS flag chips), `ProgressRing`, `GlassCard`, `Avatar`, `Segmented`, `StatusDot`, `MomentumIndicator`. |
| `bracket.jsx` | feature | Group selector grid, two-tap `RankingPanel` (auto-advances to next group on lock), `ThirdPlaceAutomator`, `POWER` ranking. |
| `knockout-data.js` | data | KO tree (R32→Final + Bronze) from the official FWC26 schedule, with seed/third slot specs. |
| `knockout.jsx` | feature | `computeBracket()` (resolves seeds + 8 best thirds, winners/losers), `KnockoutBracket` (tap-to-advance, champion banner, bronze final). |
| `scoring.js` | logic | `computeBracketScore()` + `SCORE` tiers → live "you" total for the leaderboard. |
| `predictor.jsx` | feature | Daily predictor: one-tap winner (1/X/2), optional exact-score bonus, Virtual Monkey safety net. Outcomes are **locked to the user's group ranking** (cannot contradict the bracket). |
| `leaderboard.jsx` | feature | Individual / Dept-vs-Dept, momentum, exact-score streaks, banter reactions; "You" score is the live bracket total. |
| `header.jsx` | feature | Sticky progress-ring header, Phase A/B toggle, live "Stadium Pitch" widget (reads live feed). |
| `tweaks-panel.jsx` | tooling | In-app tweak panel (accent, glass, glow) — design-time only. |
| `app.jsx` | root | State (rankings, koPicks, predState, phase, tab), localStorage persistence, wiring, `useLiveScores()`. |

## State management
Persisted to `localStorage` under `sensi-wc-2026`: `{ phase, tab, rankings, predState, koPicks, bracketView }`.
- `rankings`: `{ [group]: [code,code,code,code] }` (ordered 1st→4th).
- `predState`: `{ preds: { [matchId]: { pick:'home'|'draw'|'away', score:[h,a]|null } }, locked: { [matchId]: true }, monkey:bool }`.
- `koPicks`: `{ [matchId]: winnerCode }`.
Live scores are **not** persisted — they come from the feed each session via `useLiveScores()`.

## Design tokens
CSS variables (set in the HTML `<style>`, overridable via the tweak panel):
- `--accent` electric blue `#38bdf8` · `--pitch` green `#10b981`
- `--glass-alpha` (surface opacity) · `--glass-blur` (backdrop blur)
- Background: deep slate `#070b16` with stadium-glow radial gradients.
- Fonts: **Archivo** (display/headings), **Plus Jakarta Sans** (body) — Google Fonts.
- Accents per department in `DEPT_ACCENT`. Status: green=locked, amber=in-progress, white/dim=untouched.

## Assets
No external image assets — flags are **CSS-rendered circular chips** (`FlagChip`, colors in `data.js`). Icons are
**lucide** (UMD). If you move to a real codebase, you may swap `FlagChip` for real flag SVGs keyed by team code.

## Files in this bundle
All source files listed in the table above are included. Start at `scores-provider.js` for the integration.
```
