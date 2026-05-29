/* Unit tests — football-data.org v4 -> normalized schema mapping.
   Run with: npm test  (node --test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMatch, mapStatus, mapGroupStage, teamCode } from '../scores/providers/footballData.js';

test('mapStatus buckets football-data statuses', () => {
  assert.equal(mapStatus('SCHEDULED'), 'upcoming');
  assert.equal(mapStatus('TIMED'), 'upcoming');
  assert.equal(mapStatus('IN_PLAY'), 'live');
  assert.equal(mapStatus('PAUSED'), 'live');
  assert.equal(mapStatus('FINISHED'), 'finished');
  assert.equal(mapStatus('AWARDED'), 'finished');
  assert.equal(mapStatus('POSTPONED'), 'upcoming');
});

test('mapGroupStage extracts group letter and KO tags', () => {
  assert.equal(mapGroupStage({ group: 'GROUP_A', stage: 'GROUP_STAGE' }), 'A');
  assert.equal(mapGroupStage({ group: 'GROUP_L', stage: 'GROUP_STAGE' }), 'L');
  assert.equal(mapGroupStage({ group: null, stage: 'LAST_32' }), 'R32');
  assert.equal(mapGroupStage({ group: null, stage: 'LAST_16' }), 'R16');
  assert.equal(mapGroupStage({ group: null, stage: 'QUARTER_FINALS' }), 'QF');
  assert.equal(mapGroupStage({ group: null, stage: 'SEMI_FINALS' }), 'SF');
  assert.equal(mapGroupStage({ group: null, stage: 'THIRD_PLACE' }), '3RD');
  assert.equal(mapGroupStage({ group: null, stage: 'FINAL' }), 'F');
});

test('teamCode resolves by name, then tla, to app codes', () => {
  assert.equal(teamCode({ name: 'Brazil', tla: 'BRA' }), 'BRA');
  assert.equal(teamCode({ name: 'Korea Republic', tla: 'KOR' }), 'KOR');
  // unknown name but valid tla still resolves to a known app code
  assert.equal(teamCode({ name: 'Saudi Arabia', tla: 'KSA' }), 'KSA');
  // always returns a 3-char code, never throws
  assert.equal(teamCode({ name: 'Atlantis', tla: 'ATL' }).length, 3);
});

test('mapMatch produces the full normalized schema', () => {
  const fixture = {
    id: 537001,
    utcDate: '2026-06-11T23:00:00Z',
    status: 'IN_PLAY',
    minute: '67',
    stage: 'GROUP_STAGE',
    group: 'GROUP_C',
    venue: 'SoFi Stadium',
    homeTeam: { name: 'Brazil', tla: 'BRA' },
    awayTeam: { name: 'Morocco', tla: 'MAR' },
    score: { fullTime: { home: 1, away: 0 } },
  };
  const m = mapMatch(fixture);
  assert.equal(m.id, '537001');
  assert.equal(m.group, 'C');
  assert.equal(m.home, 'BRA');
  assert.equal(m.away, 'MAR');
  assert.equal(m.venue, 'SoFi Stadium');
  assert.match(m.kickoff, /^\d{2}:\d{2}$/);
  assert.equal(m.status, 'live');
  assert.equal(m.min, 67);
  assert.deepEqual(m.score, [1, 0]);
});

test('mapMatch tolerates missing minute / score', () => {
  const m = mapMatch({
    id: 1, utcDate: '2026-06-12T18:00:00Z', status: 'TIMED',
    stage: 'GROUP_STAGE', group: 'GROUP_I',
    homeTeam: { name: 'France', tla: 'FRA' }, awayTeam: { name: 'Senegal', tla: 'SEN' },
    score: { fullTime: { home: null, away: null } },
  });
  assert.equal(m.min, 0);
  assert.deepEqual(m.score, [0, 0]);
  assert.equal(m.status, 'upcoming');
});
