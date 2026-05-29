/* ============================================================
   Sensi World Cup — football-data.org (v4) adapter
   ------------------------------------------------------------
   Calls the v4 /competitions/{WC}/matches endpoint for the FIFA
   World Cup and maps the payload into the app's NORMALIZED schema.
   The secret token lives in process.env (FOOTBALL_DATA_TOKEN) and
   NEVER reaches the browser.

   Auth:   header  X-Auth-Token: <token>
   Free tier: 10 requests/minute, World Cup (code "WC") included.
   Docs:   https://docs.football-data.org/general/v4/
   ============================================================ */
import { config } from '../../config.js';
import { codeFor, CODES } from '../teamMap.js';
import { kickoffET } from '../normalize.js';

const KNOWN = new Set(CODES);

/* football-data "GROUP_A"/stage -> app's 'A'..'L' or KO tag */
const STAGE_TAG = {
  LAST_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF', THIRD_PLACE: '3RD', FINAL: 'F',
};
export function mapGroupStage(m) {
  if (m.group) {
    const g = String(m.group).match(/([A-L])\s*$/i); // "GROUP_A" -> "A"
    if (g) return g[1].toUpperCase();
  }
  return STAGE_TAG[String(m.stage || '')] || '';
}

/* football-data status -> our three buckets.
   SCHEDULED/TIMED -> upcoming · IN_PLAY/PAUSED -> live · FINISHED/AWARDED -> finished */
export function mapStatus(s) {
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'live';
  if (s === 'FINISHED' || s === 'AWARDED') return 'finished';
  return 'upcoming';
}

/* prefer the full team name (richest alias coverage); fall back to the
   provider's 3-letter `tla`; finally a graceful slice from codeFor(). */
export function teamCode(team) {
  if (!team) return '';
  const byName = codeFor(team.name);
  if (KNOWN.has(byName)) return byName;
  if (team.tla) {
    const byTla = codeFor(team.tla);
    if (KNOWN.has(byTla)) return byTla;
  }
  return byName;
}

export function mapMatch(m) {
  return {
    id: String(m.id),
    group: mapGroupStage(m),
    home: teamCode(m.homeTeam),
    away: teamCode(m.awayTeam),
    venue: m.venue || '',
    kickoff: kickoffET(m.utcDate),
    status: mapStatus(m.status),
    min: parseInt(m.minute, 10) || 0,
    score: [m.score?.fullTime?.home ?? 0, m.score?.fullTime?.away ?? 0],
  };
}

// One request returns today's WC matches (live ones included), keeping us
// well under the free tier's 10 req/min — the cache is the real guard.
async function fetchMatches() {
  const { baseUrl, apiKey, competition } = config.scores;
  const today = new Date().toISOString().slice(0, 10);
  const url = `${baseUrl}/competitions/${competition}/matches?dateFrom=${today}&dateTo=${today}`;

  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey, Accept: 'application/json' } });
  if (!res.ok) {
    // football-data surfaces problems with real HTTP codes (403 restricted,
    // 429 rate-limited, 400 bad filter). Bubble up a typed message.
    let detail = '';
    try { detail = ' ' + ((await res.json()).message || ''); } catch { /* non-JSON */ }
    throw new Error(`football-data ${res.status}${detail}`);
  }
  const data = await res.json();
  return data.matches || [];
}

export async function getMatches() {
  const matches = (await fetchMatches())
    .map(mapMatch)
    .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
  return { matches, mode: 'live' };
}
