/* ============================================================
   Sensi World Cup — server-side scoring engine (authoritative)
   ------------------------------------------------------------
   Mirrors the prototype's SCORE tiers (scoring.js on the frontend)
   so displayed projections and the shared leaderboard agree.

   Two flavours:
     • PROJECTED — points locked in from committed picks (what the
       prototype shows today).
     • GRADED    — matchday picks scored against real finished results
       (the production source of truth once matches end).
   ============================================================ */
import { KO_ROUND_OF, KO_FINAL_ID } from './lib/koTree.js';
import { GROUP_KEYS } from './data.js';

export const SCORE = {
  GROUP_LOCK: 10,
  OUTCOME: 3,
  EXACT: 2,
  KO: { R32: 5, R16: 10, QF: 20, SF: 40, F: 75, BRONZE: 15 },
  CHAMPION_BONUS: 40,
  YOU_BASE: 742,
};

const outcomeOf = (h, a) => (h > a ? 'home' : h < a ? 'away' : 'draw');

/**
 * @param {object} state   { rankings, koPicks, predState }
 * @param {Map<string,object>} results  matchId -> { status, home_goals, away_goals }
 */
export function computeScore(state = {}, results = new Map()) {
  const r = state.rankings || {};
  const ko = state.koPicks || {};
  const ps = state.predState || { preds: {}, locked: {} };

  const lockedGroups = GROUP_KEYS.filter((g) => (r[g] || []).length >= 4).length;
  const group = lockedGroups * SCORE.GROUP_LOCK;

  // ---- matchday: projected vs graded ----
  let matchdayProjected = 0;
  let matchdayGraded = 0;
  for (const id of Object.keys(ps.locked || {})) {
    const p = (ps.preds || {})[id];
    if (!p || !p.pick) continue;
    matchdayProjected += SCORE.OUTCOME + (p.score ? SCORE.EXACT : 0);

    const res = results.get(String(id));
    if (res && res.status === 'finished' && res.home_goals != null) {
      const actual = outcomeOf(res.home_goals, res.away_goals);
      if (p.pick === actual) matchdayGraded += SCORE.OUTCOME;
      if (p.score && p.score[0] === res.home_goals && p.score[1] === res.away_goals) {
        matchdayGraded += SCORE.EXACT;
      }
    }
  }

  // ---- knockout: round-weighted points per committed pick ----
  let knockout = 0;
  for (const id of Object.keys(ko)) {
    if (!ko[id]) continue;
    const round = KO_ROUND_OF[id];
    if (round && SCORE.KO[round] != null) knockout += SCORE.KO[round];
  }
  const champion = ko[KO_FINAL_ID] || null;
  if (champion) knockout += SCORE.CHAMPION_BONUS;

  const projectedTotal = group + matchdayProjected + knockout;
  const gradedTotal = group + matchdayGraded + knockout;

  return {
    group,
    knockout,
    matchday: matchdayProjected,
    matchdayGraded,
    total: projectedTotal,
    gradedTotal,
    champion,
    lockedGroups,
    base: SCORE.YOU_BASE,
    you: SCORE.YOU_BASE + projectedTotal,
  };
}
