/* Unit tests — team mapping, normalization, scoring.
   Run with: npm test  (node --test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODES, codeFor } from '../scores/teamMap.js';
import { normalizeGroup, normalizeStatus, kickoffET } from '../scores/normalize.js';
import { computeScore, SCORE } from '../scoring.js';

test('team map covers all 48 FWC26 teams', () => {
  assert.equal(CODES.length, 48, 'expected 48 team codes');
  assert.equal(new Set(CODES).size, 48, 'codes must be unique');
});

test('codeFor resolves common provider naming variants', () => {
  const cases = {
    'South Korea': 'KOR', 'Korea Republic': 'KOR',
    'Czech Republic': 'CZE', 'Czechia': 'CZE',
    'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
    'Turkey': 'TUR', 'Türkiye': 'TUR',
    'DR Congo': 'COD', 'Congo DR': 'COD',
    'Cape Verde': 'CPV', 'Cabo Verde': 'CPV',
    'United States': 'USA', 'USA': 'USA',
    'Curaçao': 'CUW', 'Curacao': 'CUW',
    'Iran': 'IRN', 'IR Iran': 'IRN',
    'Bosnia and Herzegovina': 'BIH',
    'Saudi Arabia': 'KSA', 'Brazil': 'BRA', 'England': 'ENG',
  };
  for (const [name, code] of Object.entries(cases)) {
    assert.equal(codeFor(name), code, `${name} -> ${code}`);
  }
});

test('codeFor falls back gracefully for unknown teams', () => {
  assert.equal(codeFor('Atlantis').length, 3);
});

test('normalizeGroup extracts group letters and KO rounds', () => {
  assert.equal(normalizeGroup('Group A'), 'A');
  assert.equal(normalizeGroup('Group Stage - C'), 'C');
  assert.equal(normalizeGroup('1st Round - Group L'), 'L');
  assert.equal(normalizeGroup('Round of 32'), 'R32');
  assert.equal(normalizeGroup('Round of 16'), 'R16');
  assert.equal(normalizeGroup('Quarter-finals'), 'QF');
  assert.equal(normalizeGroup('Semi-finals'), 'SF');
  assert.equal(normalizeGroup('Final'), 'F');
  assert.equal(normalizeGroup('3rd Place Final'), '3RD');
});

test('normalizeStatus buckets provider short codes', () => {
  assert.equal(normalizeStatus('NS'), 'upcoming');
  assert.equal(normalizeStatus('1H'), 'live');
  assert.equal(normalizeStatus('HT'), 'live');
  assert.equal(normalizeStatus('FT'), 'finished');
  assert.equal(normalizeStatus('AET'), 'finished');
  assert.equal(normalizeStatus('PEN'), 'finished');
});

test('kickoffET returns HH:MM', () => {
  const t = kickoffET('2026-06-11T23:00:00Z');
  assert.match(t, /^\d{2}:\d{2}$/);
});

test('computeScore: group locks + matchday projection + grading', () => {
  const state = {
    rankings: { A: ['MEX', 'RSA', 'KOR', 'CZE'], B: ['CAN', 'BIH', 'QAT', 'SUI'] },
    koPicks: { '104': 'BRA' }, // final winner -> KO F weight + champion bonus
    predState: {
      preds: { m1: { pick: 'home', score: [2, 0] } },
      locked: { m1: true },
    },
  };
  // no results yet -> projected only
  let s = computeScore(state, new Map());
  assert.equal(s.group, 2 * SCORE.GROUP_LOCK);
  assert.equal(s.matchday, SCORE.OUTCOME + SCORE.EXACT);
  assert.equal(s.knockout, SCORE.KO.F + SCORE.CHAMPION_BONUS);
  assert.equal(s.champion, 'BRA');

  // grade against a finished result that matches exactly
  const results = new Map([['m1', { status: 'finished', home_goals: 2, away_goals: 0 }]]);
  s = computeScore(state, results);
  assert.equal(s.matchdayGraded, SCORE.OUTCOME + SCORE.EXACT);

  // wrong score, right outcome -> outcome only
  const results2 = new Map([['m1', { status: 'finished', home_goals: 1, away_goals: 0 }]]);
  s = computeScore(state, results2);
  assert.equal(s.matchdayGraded, SCORE.OUTCOME);
});
