/* ============================================================
   Sensi World Cup — DEMO scores provider (server-side)
   ------------------------------------------------------------
   A realistic, server-side ticking feed so the whole app is fully
   functional with ZERO configuration. The moment a real
   FOOTBALL_API_KEY is set, config.features.liveScores flips and the
   scores layer uses the API-Football adapter instead — no code change.

   Seeded from the same FWC26 fixtures the prototype shipped with.
   ============================================================ */

const SEED = [
  { id: 'm1', group: 'C', home: 'BRA', away: 'MAR', kickoff: '15:00', venue: 'Los Angeles', status: 'live',     min: 67, score: [1, 0] },
  { id: 'm2', group: 'E', home: 'GER', away: 'CIV', kickoff: '16:00', venue: 'Atlanta',     status: 'live',     min: 23, score: [0, 0] },
  { id: 'm3', group: 'I', home: 'FRA', away: 'SEN', kickoff: '18:00', venue: 'New York NJ', status: 'upcoming', min: 0,  score: [0, 0] },
  { id: 'm4', group: 'H', home: 'ESP', away: 'KSA', kickoff: '21:00', venue: 'Dallas',      status: 'upcoming', min: 0,  score: [0, 0] },
  { id: 'm5', group: 'J', home: 'ARG', away: 'AUT', kickoff: '21:00', venue: 'Kansas City', status: 'upcoming', min: 0,  score: [0, 0] },
];

let state = null;
let lastTick = 0;

function init() {
  state = SEED.map((m) => ({ ...m, score: [...m.score] }));
  lastTick = Date.now();
}

// advance the simulation at most once per real second so repeated
// (cached) reads within a poll window stay coherent
function tick() {
  if (!state) init();
  const now = Date.now();
  if (now - lastTick < 1000) return;
  lastTick = now;
  for (const m of state) {
    if (m.status === 'live') {
      m.min = Math.min(90, m.min + (1 + Math.floor(Math.random() * 2)));
      if (Math.random() < 0.08) m.score[Math.random() < 0.5 ? 0 : 1] += 1;
      if (m.min >= 90) m.status = 'finished';
    }
  }
}

export async function getMatches() {
  tick();
  return {
    matches: state.map((m) => ({ ...m, score: [...m.score] })),
    mode: 'demo',
  };
}
