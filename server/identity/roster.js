/* ============================================================
   Sensi World Cup — roster builder (Okta identities ⟕ game stats)
   ------------------------------------------------------------
   The production leaderboard = each provisioned user joined with the
   score computed from their committed picks. Extracted so both the
   /api/roster route and the test suite exercise the SAME logic.
   ============================================================ */
import { listUsers, getState, allResults } from '../db/repo.js';
import { computeScore } from '../scoring.js';
import { DEPARTMENTS, normalizeDept } from '../data.js';

export function buildRoster(meId = null) {
  const results = new Map(allResults().map((r) => [r.match_id, r]));

  const players = listUsers().map((u) => {
    const score = computeScore(getState(u.id), results);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      dept: normalizeDept(u.dept),
      you: u.id === meId,
      score: score.you,           // base + projected/graded total
      delta: 0,                   // momentum: filled by a future standings job
      champ: score.champion,
      exact: 0,
      streak: 0,
    };
  }).sort((a, b) => b.score - a.score);

  const present = new Set(players.map((p) => p.dept));
  const departments = [
    ...DEPARTMENTS.filter((d) => present.has(d)),
    ...[...present].filter((d) => !DEPARTMENTS.includes(d)),
  ];
  return { players, departments };
}
