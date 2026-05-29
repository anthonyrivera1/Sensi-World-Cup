/* ============================================================
   Sensi World Cup — server configuration & feature detection
   ------------------------------------------------------------
   The whole backend is designed to be PLUG-AND-PLAY:
     • No env at all            -> everything runs in DEMO mode.
     • Add FOOTBALL_DATA_TOKEN  -> live scores switch to the real
                                   provider automatically.
     • Add the OKTA_* vars      -> identity/roster switch to real
                                   Okta SSO automatically.
   Nothing else needs to change to go from prototype to production.
   ============================================================ */
// Load .env if dotenv is installed; harmless no-op if it isn't.
try { await import('dotenv/config'); } catch { /* dotenv optional */ }
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = process.env;
const bool = (v, d = false) => (v == null ? d : /^(1|true|yes|on)$/i.test(String(v)));
const num = (v, d) => (v == null || v === '' ? d : Number(v));

export const config = {
  port: num(env.PORT, 3000),
  // path to the static prototype (one level up from /server)
  staticDir: path.resolve(__dirname, '..'),
  htmlEntry: 'Sensi World Cup.html',

  session: {
    secret: env.SESSION_SECRET || 'dev-insecure-session-secret-change-me',
    secure: bool(env.SESSION_SECURE, env.NODE_ENV === 'production'),
  },

  scores: {
    provider: env.SCORES_PROVIDER || 'football-data', // 'football-data' | 'api-football' | 'demo'
    // credential — football-data calls it a token; accept the legacy
    // FOOTBALL_API_KEY name too so either env var works.
    apiKey: env.FOOTBALL_DATA_TOKEN || env.FOOTBALL_API_KEY || '',
    cacheTtlMs: num(env.SCORES_CACHE_TTL_MS, 15000), // rate-limit guard

    // --- football-data.org (default provider) ---
    baseUrl: env.FOOTBALL_DATA_BASE || 'https://api.football-data.org/v4',
    competition: env.FOOTBALL_COMPETITION || 'WC', // FIFA World Cup on football-data

    // --- api-football / api-sports.io (alternate provider) ---
    apiFootballBase: env.FOOTBALL_API_BASE || 'https://v3.football.api-sports.io',
    league: num(env.FOOTBALL_LEAGUE_ID, 1), // FIFA World Cup = 1 on API-Football
    season: num(env.FOOTBALL_SEASON, 2026),
  },

  okta: {
    issuer: env.OKTA_ISSUER || '',
    clientId: env.OKTA_CLIENT_ID || '',
    clientSecret: env.OKTA_CLIENT_SECRET || '',
    redirectUri: env.OKTA_REDIRECT_URI || `http://localhost:${num(env.PORT, 3000)}/auth/callback`,
    postLogoutRedirectUri: env.OKTA_POST_LOGOUT_URI || `http://localhost:${num(env.PORT, 3000)}/`,
    // Okta profile attribute (or 'groups') that carries the department
    deptClaim: env.OKTA_DEPT_CLAIM || 'department',
  },

  db: {
    file: env.DB_FILE || path.resolve(__dirname, 'data', 'sensi-wc.sqlite'),
  },

  // Phase lifecycle: tournament auto-starts when the feed reports any
  // live/finished match OR the wall clock passes this ISO timestamp.
  tournamentStart: env.TOURNAMENT_START || '',
};

/* ---- feature flags: are the real integrations configured? ---- */
export const features = {
  liveScores: Boolean(config.scores.apiKey) && config.scores.provider !== 'demo',
  okta: Boolean(config.okta.issuer && config.okta.clientId && config.okta.clientSecret),
};

export function describeMode() {
  return {
    scores: features.liveScores ? `live (${config.scores.provider})` : 'demo (no FOOTBALL_DATA_TOKEN)',
    identity: features.okta ? 'okta' : 'demo (no OKTA_* env)',
  };
}
