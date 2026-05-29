/* ============================================================
   Sensi World Cup — scores service (cache + provider selection)
   ------------------------------------------------------------
   getLiveScores() returns { matches, updatedAt, mode } in the app's
   normalized schema. Results are cached (config.scores.cacheTtlMs) so
   the frontend can poll aggressively without burning the provider's
   rate limit — the cache, not the poll interval, is the real guard.
   On a provider error we serve the last good snapshot if we have one.
   ============================================================ */
import { config, features } from '../config.js';
import * as footballData from './providers/footballData.js';
import * as apiFootball from './providers/apiFootball.js';
import * as demo from './providers/demo.js';

// Pick the live provider by name; fall back to demo until a key is set.
const REAL = { 'football-data': footballData, 'api-football': apiFootball };
const provider = features.liveScores ? (REAL[config.scores.provider] || footballData) : demo;

let cache = null;       // { matches, updatedAt, mode }
let inflight = null;    // de-dupe concurrent refreshes

async function refresh() {
  const { matches, mode } = await provider.getMatches();
  cache = { matches, updatedAt: Date.now(), mode };
  return cache;
}

export async function getLiveScores() {
  const fresh = cache && Date.now() - cache.updatedAt < config.scores.cacheTtlMs;
  if (fresh) return cache;
  if (inflight) return inflight;

  inflight = refresh()
    .catch((err) => {
      console.error('[scores] provider error:', err.message);
      if (cache) return { ...cache, stale: true }; // serve last good data
      // no snapshot yet — surface a typed error to the route
      const e = new Error('scores provider unavailable: ' + err.message);
      e.status = 502;
      throw e;
    })
    .finally(() => { inflight = null; });

  return inflight;
}
