/* ============================================================
   Sensi World Cup — API-Football (api-sports.io) adapter
   ------------------------------------------------------------
   Calls the v3 /fixtures endpoint for the FIFA World Cup, maps the
   payload into the app's NORMALIZED schema. The secret key lives in
   process.env.FOOTBALL_API_KEY and NEVER reaches the browser.

   Docs: https://www.api-football.com/documentation-v3
   FWC26 guide: league=1, season=2026.
   ============================================================ */
import { config } from '../../config.js';
import { codeFor, normalizeGroup, normalizeStatus, kickoffET } from '../normalize.js';

// Fetch both currently-live fixtures and today's scheduled ones, merge.
async function fetchFixtures() {
  const { apiFootballBase: baseUrl, apiKey, league, season } = config.scores;
  const headers = { 'x-apisports-key': apiKey, Accept: 'application/json' };

  // today (any status) so upcoming/finished matches also render
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `${baseUrl}/fixtures?league=${league}&season=${season}&live=all`,
    `${baseUrl}/fixtures?league=${league}&season=${season}&date=${today}`,
  ];

  const results = await Promise.allSettled(
    urls.map((u) => fetch(u, { headers }).then((r) => {
      if (!r.ok) throw new Error(`api-football ${r.status}`);
      return r.json();
    })),
  );

  const byId = new Map();
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    const errs = res.value?.errors;
    if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
      // API-Football returns 200 with an `errors` object on quota/auth issues
      throw new Error('api-football: ' + JSON.stringify(errs));
    }
    for (const f of res.value?.response || []) {
      byId.set(f.fixture?.id, f); // live copy overwrites the dated copy (fresher)
    }
  }
  if (!byId.size && results.every((r) => r.status === 'rejected')) {
    throw results[0].reason || new Error('api-football: all requests failed');
  }
  return [...byId.values()];
}

function mapFixture(f) {
  return {
    id: String(f.fixture.id),
    group: normalizeGroup(f.league?.round),
    home: codeFor(f.teams?.home?.name),
    away: codeFor(f.teams?.away?.name),
    venue: f.fixture?.venue?.city || f.fixture?.venue?.name || '',
    kickoff: kickoffET(f.fixture?.date),
    status: normalizeStatus(f.fixture?.status?.short),
    min: f.fixture?.status?.elapsed ?? 0,
    score: [f.goals?.home ?? 0, f.goals?.away ?? 0],
  };
}

export async function getMatches() {
  const fixtures = await fetchFixtures();
  const matches = fixtures
    .map(mapFixture)
    // keep kickoff order stable for the UI
    .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
  return { matches, mode: 'live' };
}
