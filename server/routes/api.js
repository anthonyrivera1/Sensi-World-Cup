/* ============================================================
   Sensi World Cup — core API routes
     GET  /api/scores  -> { matches, updatedAt, mode }  (live feed)
     GET  /api/state   -> the signed-in user's saved game state
     PUT  /api/state   -> persist state (server-enforced kickoff locks)
     GET  /api/phase   -> derived Pre-Tournament / Matchday lifecycle
     GET  /api/health  -> status + which integrations are live vs demo
   ============================================================ */
import { features, describeMode } from '../config.js';
import { getLiveScores } from '../scores/index.js';
import { getState, putState, ingestResults, isMatchLocked, allResults } from '../db/repo.js';
import { computeScore } from '../scoring.js';
import { phaseState, tournamentStarted } from '../lib/phase.js';
import { GROUP_KEYS } from '../data.js';

// who is the request acting as? (Okta session, or the demo user)
function currentUserId(req) {
  return req.session?.user?.id || 'demo-you';
}

export function registerApiRoutes(app) {
/* ---------------- GET /api/scores ---------------- */
app.get('/api/scores', async (req, res) => {
  try {
    const data = await getLiveScores();
    // keep authoritative results fresh for grading + lock enforcement
    ingestResults(data.matches);
    res.set('Cache-Control', 'no-store');
    res.json({ matches: data.matches, updatedAt: data.updatedAt, mode: data.mode });
  } catch (e) {
    res.status(e.status || 502).json({ error: 'scores_unavailable', message: e.message });
  }
});

/* ---------------- GET /api/state ---------------- */
app.get('/api/state', (req, res) => {
  const state = getState(currentUserId(req));
  const results = new Map(allResults().map((r) => [r.match_id, r]));
  res.json({ ...state, score: computeScore(state, results) });
});

/* ---------------- PUT /api/state ----------------
   Persists the user's bracket/predictions. The server is the source of
   truth for locks: edits to matches that have kicked off (or to group
   rankings after the tournament starts) are rejected and the stored
   value is kept. Returns the effective state + any rejected edits. */
app.put('/api/state', (req, res) => {
  const userId = currentUserId(req);
  const prev = getState(userId);
  const incoming = req.body || {};
  const rejected = [];

  const started = tournamentStarted().started;

  // rankings + koPicks freeze once the tournament starts
  let rankings = incoming.rankings ?? prev.rankings;
  let koPicks = incoming.koPicks ?? prev.koPicks;
  if (started) {
    if (incoming.rankings && JSON.stringify(incoming.rankings) !== JSON.stringify(prev.rankings)) {
      rankings = prev.rankings;
      rejected.push({ field: 'rankings', reason: 'bracket_locked' });
    }
    if (incoming.koPicks && JSON.stringify(incoming.koPicks) !== JSON.stringify(prev.koPicks)) {
      koPicks = prev.koPicks;
      rejected.push({ field: 'koPicks', reason: 'bracket_locked' });
    }
  }

  // matchday predictions: per-match lock at kickoff
  const prevPreds = prev.predState?.preds || {};
  const prevLocked = prev.predState?.locked || {};
  const inPred = incoming.predState || prev.predState || { preds: {}, locked: {}, monkey: false };
  const preds = { ...inPred.preds };
  for (const id of new Set([...Object.keys(preds), ...Object.keys(prevPreds)])) {
    if (isMatchLocked(id)) {
      const changed = JSON.stringify(preds[id]) !== JSON.stringify(prevPreds[id]);
      if (changed) { preds[id] = prevPreds[id]; rejected.push({ field: `pred:${id}`, reason: 'kickoff_locked' }); }
    }
  }
  const predState = { ...inPred, preds, locked: { ...prevLocked, ...(inPred.locked || {}) } };

  const saved = putState(userId, { rankings, koPicks, predState });
  const results = new Map(allResults().map((r) => [r.match_id, r]));
  res.json({ ...saved, score: computeScore(saved, results), rejected });
});

/* ---------------- GET /api/phase ---------------- */
app.get('/api/phase', (req, res) => res.json(phaseState()));

/* ---------------- GET /api/health ---------------- */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: describeMode(),
    features,
    groups: GROUP_KEYS.length,
    time: new Date().toISOString(),
  });
});
}
