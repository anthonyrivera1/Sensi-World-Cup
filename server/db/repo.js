/* ============================================================
   Sensi World Cup — data-access layer (repository)
   Thin, typed helpers over the SQLite tables in db.js.
   ============================================================ */
import { db, tx } from './db.js';

const now = () => Date.now();

/* ---------------- users ---------------- */
const _upsertUser = db.prepare(`
  INSERT INTO users (id, name, email, dept, created_at, last_login)
  VALUES (@id, @name, @email, @dept, @ts, @ts)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    email = COALESCE(excluded.email, users.email),
    dept = COALESCE(excluded.dept, users.dept),
    last_login = excluded.last_login
`);
export function upsertUser({ id, name, email = null, dept = null }) {
  _upsertUser.run({ id, name, email, dept, ts: now() });
  // ensure a game_state row exists
  db.prepare(`INSERT OR IGNORE INTO game_state (user_id, updated_at) VALUES (?, ?)`).run(id, now());
  return getUser(id);
}

const _getUser = db.prepare(`SELECT * FROM users WHERE id = ?`);
export const getUser = (id) => _getUser.get(id) || null;

const _listUsers = db.prepare(`SELECT * FROM users ORDER BY created_at ASC`);
export const listUsers = () => _listUsers.all();

/* ---------------- game state ---------------- */
const _getState = db.prepare(`SELECT * FROM game_state WHERE user_id = ?`);
export function getState(userId) {
  const row = _getState.get(userId);
  if (!row) return { rankings: {}, koPicks: {}, predState: { preds: {}, locked: {}, monkey: false } };
  return {
    rankings: JSON.parse(row.rankings),
    koPicks: JSON.parse(row.ko_picks),
    predState: JSON.parse(row.pred_state),
    updatedAt: row.updated_at,
  };
}

const _putState = db.prepare(`
  INSERT INTO game_state (user_id, rankings, ko_picks, pred_state, updated_at)
  VALUES (@user_id, @rankings, @ko_picks, @pred_state, @ts)
  ON CONFLICT(user_id) DO UPDATE SET
    rankings = excluded.rankings,
    ko_picks = excluded.ko_picks,
    pred_state = excluded.pred_state,
    updated_at = excluded.updated_at
`);
const _ensureUser = db.prepare(
  `INSERT OR IGNORE INTO users (id, name, created_at) VALUES (?, ?, ?)`,
);
export function putState(userId, { rankings = {}, koPicks = {}, predState = {} }) {
  // guarantee FK integrity even if the user wasn't provisioned via /api/me
  _ensureUser.run(userId, userId, now());
  _putState.run({
    user_id: userId,
    rankings: JSON.stringify(rankings),
    ko_picks: JSON.stringify(koPicks),
    pred_state: JSON.stringify(predState),
    ts: now(),
  });
  return getState(userId);
}

/* ---------------- match results (grading + locks) ---------------- */
const _upsertResult = db.prepare(`
  INSERT INTO match_results (match_id, grp, home, away, status, home_goals, away_goals, kickoff_at, updated_at)
  VALUES (@match_id, @grp, @home, @away, @status, @home_goals, @away_goals, @kickoff_at, @ts)
  ON CONFLICT(match_id) DO UPDATE SET
    grp = excluded.grp, home = excluded.home, away = excluded.away,
    status = excluded.status, home_goals = excluded.home_goals,
    away_goals = excluded.away_goals,
    kickoff_at = COALESCE(excluded.kickoff_at, match_results.kickoff_at),
    updated_at = excluded.updated_at
`);

export const ingestResults = (matches) => tx(() => {
  for (const m of matches || []) {
    _upsertResult.run({
      match_id: String(m.id),
      grp: m.group ?? '',
      home: m.home ?? '',
      away: m.away ?? '',
      status: m.status ?? 'upcoming',
      home_goals: Array.isArray(m.score) ? m.score[0] : null,
      away_goals: Array.isArray(m.score) ? m.score[1] : null,
      kickoff_at: m.kickoffAt ?? null,
      ts: now(),
    });
  }
});

const _getResult = db.prepare(`SELECT * FROM match_results WHERE match_id = ?`);
export const getResult = (matchId) => _getResult.get(String(matchId)) || null;

const _allResults = db.prepare(`SELECT * FROM match_results`);
export const allResults = () => _allResults.all();

// a match is "locked" once it is live/finished (kickoff has passed)
export function isMatchLocked(matchId) {
  const r = getResult(matchId);
  if (!r) return false;
  if (r.status === 'live' || r.status === 'finished') return true;
  if (r.kickoff_at && Date.now() >= r.kickoff_at) return true;
  return false;
}
