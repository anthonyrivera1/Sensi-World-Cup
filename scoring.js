/* ============================================================
   Sensi World Cup — scoring engine
   Turns the user's committed predictions into a live point total
   that feeds the leaderboard. (Projected points — locked in.)
   ============================================================ */

const SCORE = {
  GROUP_LOCK: 10,        // per fully-ranked, locked group
  OUTCOME: 3,            // matchday: correct winner / draw
  EXACT: 2,              // matchday: exact scoreline bonus
  KO: { R32: 5, R16: 10, QF: 20, SF: 40, F: 75, BRONZE: 15 },
  CHAMPION_BONUS: 40,    // extra for naming a champion
  YOU_BASE: 742,         // baseline so an empty bracket sits low on the board
};

function computeBracketScore(state) {
  state = state || {};
  const r = state.rankings || {};
  const ko = state.koPicks || {};
  const ps = state.predState || { preds: {}, locked: {} };

  const lockedGroups = window.GROUP_KEYS.filter((g) => (r[g] || []).length >= 4).length;
  const group = lockedGroups * SCORE.GROUP_LOCK;

  // matchday — points per locked pick (+ exact bonus)
  let matchday = 0;
  Object.keys(ps.locked || {}).forEach((id) => {
    const p = (ps.preds || {})[id];
    if (p && p.pick) { matchday += SCORE.OUTCOME; if (p.score) matchday += SCORE.EXACT; }
  });

  // knockout — round-weighted points for every called tie
  let knockout = 0, ties = 0, champion = null;
  if (window.computeBracket) {
    const { winner } = window.computeBracket(r, ko, lockedGroups === 12);
    const wt = {};
    (window.KO_R32 || []).forEach((m) => (wt[m.id] = SCORE.KO.R32));
    (window.KO_R16 || []).forEach((m) => (wt[m.id] = SCORE.KO.R16));
    (window.KO_QF || []).forEach((m) => (wt[m.id] = SCORE.KO.QF));
    (window.KO_SF || []).forEach((m) => (wt[m.id] = SCORE.KO.SF));
    if (window.KO_FINAL) wt[window.KO_FINAL.id] = SCORE.KO.F;
    if (window.KO_BRONZE) wt[window.KO_BRONZE.id] = SCORE.KO.BRONZE;
    Object.keys(winner).forEach((id) => { if (winner[id]) { knockout += wt[id] || 0; ties += 1; } });
    champion = window.KO_FINAL ? winner[window.KO_FINAL.id] || null : null;
    if (champion) knockout += SCORE.CHAMPION_BONUS;
  }

  const total = group + matchday + knockout;
  return { group, matchday, knockout, total, ties, champion, lockedGroups, base: SCORE.YOU_BASE, you: SCORE.YOU_BASE + total };
}

Object.assign(window, { SCORE, computeBracketScore });
