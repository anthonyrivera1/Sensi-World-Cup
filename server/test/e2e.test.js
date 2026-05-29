/* ============================================================
   Sensi World Cup — end-to-end simulation
   ------------------------------------------------------------
   Boots the REAL server in-process and drives it over HTTP, then
   simulates a multi-user office league through the production data +
   scoring + roster code. Run with: npm test
   ============================================================ */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// configure BEFORE importing anything that reads config
const TMP_DB = path.join(os.tmpdir(), `sensi-e2e-${process.pid}-${Date.now()}.sqlite`);
process.env.DB_FILE = TMP_DB;
process.env.SESSION_SECRET = 'e2e-test-secret';
process.env.PORT = '0';

let server, base, repo, scoring, roster;

before(async () => {
  const { buildApp } = await import('../index.js');
  const built = buildApp();
  await new Promise((r) => built.server.listen(0, r));
  server = built.server;
  base = `http://localhost:${server.address().port}`;
  repo = await import('../db/repo.js');
  scoring = await import('../scoring.js');
  roster = await import('../identity/roster.js');
});

after(() => {
  server?.close();
  for (const f of [TMP_DB, `${TMP_DB}-journal`, `${TMP_DB}-wal`, `${TMP_DB}-shm`]) {
    try { fs.unlinkSync(f); } catch {}
  }
});

// small fetch helper that threads cookies (simulates a browser session)
function makeClient() {
  let cookie = '';
  return async (method, p, body) => {
    const res = await fetch(base + p, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setC = res.headers.get('set-cookie');
    if (setC) cookie = setC.split(';')[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  };
}

/* ---------------- HTTP surface (demo mode) ---------------- */
test('health reports demo mode + 12 groups', async () => {
  const c = makeClient();
  const { status, json } = await c('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.groups, 12);
  assert.equal(json.features.liveScores, false);
});

test('scores feed returns valid normalized matches and caches', async () => {
  const c = makeClient();
  const a = await c('GET', '/api/scores');
  assert.equal(a.status, 200);
  assert.equal(a.json.mode, 'demo');
  assert.ok(a.json.matches.length >= 5);
  for (const m of a.json.matches) {
    assert.equal(typeof m.id, 'string');
    assert.equal(m.home.length, 3);
    assert.equal(m.away.length, 3);
    assert.ok(['upcoming', 'live', 'finished'].includes(m.status));
    assert.ok(Array.isArray(m.score) && m.score.length === 2);
  }
  const b = await c('GET', '/api/scores');
  assert.equal(a.json.updatedAt, b.json.updatedAt, 'second read within TTL is cached');
});

test('demo identity resolves and bracket is editable (Phase A)', async () => {
  const c = makeClient();
  const me = await c('GET', '/api/me');
  assert.equal(me.json.you, true);
  const phase = await c('GET', '/api/phase');
  assert.equal(phase.json.phase, 'A', 'demo feed must not lock the bracket');
  assert.equal(phase.json.bracketEditable, true);
});

test('fill a bracket over HTTP: state persists and scores update', async () => {
  const c = makeClient();
  await c('GET', '/api/me'); // provision demo user
  const put = await c('PUT', '/api/state', {
    rankings: {
      A: ['MEX', 'RSA', 'KOR', 'CZE'],
      B: ['CAN', 'BIH', 'QAT', 'SUI'],
      C: ['BRA', 'MAR', 'HAI', 'SCO'],
    },
    koPicks: { '104': 'BRA' },
    predState: { preds: { m3: { pick: 'home', score: [2, 1] } }, locked: { m3: true }, monkey: false },
  });
  assert.equal(put.status, 200);
  assert.equal(put.json.score.lockedGroups, 3);
  assert.equal(put.json.score.group, 30);
  assert.equal(put.json.score.champion, 'BRA');
  assert.equal(put.json.score.matchday, 5); // outcome 3 + exact 2

  // a fresh read returns the same persisted state
  const get = await c('GET', '/api/state');
  assert.deepEqual(Object.keys(get.json.rankings).sort(), ['A', 'B', 'C']);
  assert.equal(get.json.koPicks['104'], 'BRA');
});

test('server-enforced lock: cannot edit a prediction after kickoff', async () => {
  const c = makeClient();
  await c('GET', '/api/me');
  await c('GET', '/api/scores'); // ingest results -> m1 is "live" (locked)
  const put = await c('PUT', '/api/state', {
    predState: { preds: { m1: { pick: 'away', score: [0, 3] } }, locked: { m1: true } },
  });
  assert.equal(put.status, 200);
  assert.ok(put.json.rejected.some((r) => r.field === 'pred:m1' && r.reason === 'kickoff_locked'),
    'editing a kicked-off match must be rejected');
});

/* ---------------- multi-user league simulation (production code) ---------------- */
test('simulate an office league: users, brackets, leaderboard ordering', async () => {
  const { upsertUser, putState, ingestResults } = repo;
  const { computeScore } = scoring;
  const { buildRoster } = roster;

  // create 4 employees across departments (lazy provisioning shape)
  const people = [
    { id: 'okta|alice', name: 'Alice', email: 'alice@sensi.ai', dept: 'Sales' },
    { id: 'okta|bob', name: 'Bob', email: 'bob@sensi.ai', dept: 'Finance' },
    { id: 'okta|carol', name: 'Carol', email: 'carol@sensi.ai', dept: 'R&D' },
    { id: 'okta|dave', name: 'Dave', email: 'dave@sensi.ai', dept: 'Product' },
  ];
  for (const p of people) upsertUser(p);

  // each fills a different amount of bracket -> different scores
  putState('okta|alice', { // most complete: 3 groups + champion + a graded pred
    rankings: { A: ['MEX', 'RSA', 'KOR', 'CZE'], B: ['CAN', 'BIH', 'QAT', 'SUI'], C: ['BRA', 'MAR', 'HAI', 'SCO'] },
    koPicks: { '104': 'BRA' },
    predState: { preds: { m1: { pick: 'home', score: [1, 0] } }, locked: { m1: true } },
  });
  putState('okta|bob', { // 2 groups, no champion
    rankings: { A: ['MEX', 'RSA', 'KOR', 'CZE'], B: ['CAN', 'BIH', 'QAT', 'SUI'] },
    koPicks: {}, predState: { preds: {}, locked: {} },
  });
  putState('okta|carol', { // 1 group only
    rankings: { A: ['MEX', 'RSA', 'KOR', 'CZE'] }, koPicks: {}, predState: { preds: {}, locked: {} },
  });
  // dave does nothing (baseline)

  // a real result comes in: m1 finished 1-0 -> Alice nailed the exact score
  ingestResults([{ id: 'm1', group: 'C', home: 'BRA', away: 'MAR', status: 'finished', score: [1, 0] }]);

  const { players, departments } = buildRoster('okta|carol');

  // everyone present, sorted by score desc
  assert.equal(players.length >= 4, true);
  const scores = players.map((p) => p.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'leaderboard sorted by score');

  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  assert.ok(byId['okta|alice'].score > byId['okta|bob'].score, 'Alice > Bob');
  assert.ok(byId['okta|bob'].score > byId['okta|carol'].score, 'Bob > Carol');
  assert.ok(byId['okta|carol'].score > byId['okta|dave'].score, 'Carol > Dave (baseline)');
  assert.equal(byId['okta|alice'].champ, 'BRA');
  assert.equal(byId['okta|carol'].you, true, '"you" flag tracks the viewer');

  // departments include the ones we used
  for (const d of ['Sales', 'Finance', 'R&D', 'Product']) assert.ok(departments.includes(d));

  // graded scoring: Alice's m1 exact pick is graded against the real 1-0
  const alice = computeScore({
    rankings: { A: ['MEX', 'RSA', 'KOR', 'CZE'], B: ['CAN', 'BIH', 'QAT', 'SUI'], C: ['BRA', 'MAR', 'HAI', 'SCO'] },
    koPicks: { '104': 'BRA' },
    predState: { preds: { m1: { pick: 'home', score: [1, 0] } }, locked: { m1: true } },
  }, new Map([['m1', { status: 'finished', home_goals: 1, away_goals: 0 }]]));
  assert.equal(alice.matchdayGraded, 5, 'outcome (3) + exact (2) graded');
});

test('bracket freezes over HTTP once the tournament has started', async () => {
  const { config } = await import('../config.js');
  const c = makeClient();
  await c('GET', '/api/me'); // demo-you, has groups A,B,C from an earlier test

  // force "tournament started" via a configured past start time
  const original = config.tournamentStart;
  config.tournamentStart = '2020-01-01T00:00:00Z';
  try {
    const phase = await c('GET', '/api/phase');
    assert.equal(phase.json.phase, 'B');
    assert.equal(phase.json.bracketEditable, false);
    assert.equal(phase.json.tabLabel, 'Bracket');

    // attempting to change group rankings is rejected and the old value kept
    const put = await c('PUT', '/api/state', {
      rankings: { A: ['CZE', 'KOR', 'RSA', 'MEX'] }, // reordered
    });
    assert.ok(put.json.rejected.some((r) => r.field === 'rankings' && r.reason === 'bracket_locked'));
    const get = await c('GET', '/api/state');
    assert.deepEqual(get.json.rankings.A, ['MEX', 'RSA', 'KOR', 'CZE'], 'original ranking preserved');
  } finally {
    config.tournamentStart = original;
  }
});
