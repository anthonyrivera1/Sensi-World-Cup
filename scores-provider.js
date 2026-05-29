/* ============================================================
   Sensi World Cup — Live scores provider (data adapter)
   ------------------------------------------------------------
   ONE interface the whole app reads from: getLiveMatches().
   Today it's backed by a MOCK adapter that simulates a live feed.
   To go real, set MODE = 'api' and implement /api/scores on a
   backend (holds the secret key, calls a provider, returns the
   NORMALIZED schema below). No UI changes required.

   NORMALIZED MATCH SCHEMA  (what every adapter must return):
     {
       id:      string,                      // stable match id
       group:   string,                      // 'A'..'L' (or 'R32' etc later)
       home:    string,                      // 3-letter team code (see TEAMS)
       away:    string,
       venue:   string,
       kickoff: string,                      // 'HH:MM' ET
       status:  'upcoming' | 'live' | 'finished',
       min:     number,                      // live minute (0 if not started)
       score:   [number, number],            // [home, away]
     }
   getLiveMatches() resolves to: { matches: Match[], updatedAt: number(ms) }
   ============================================================ */

const SCORES_MODE = 'api'; // 'mock' | 'api'  — backend serves a demo feed until FOOTBALL_API_KEY is set
const SCORES_API_URL = '/api/scores';

/* ---------- MOCK adapter: simulates a ticking live feed ---------- */
const _mock = {
  state: null,
  init() {
    // seed from the static fixture list
    this.state = (window.TODAY_MATCHES || []).map((m) => ({
      id: m.id, group: m.group, home: m.home, away: m.away,
      venue: m.venue, kickoff: m.kickoff,
      status: m.status, min: m.min || 0, score: [...(m.score || [0, 0])],
    }));
  },
  tick() {
    if (!this.state) this.init();
    this.state.forEach((m) => {
      if (m.status === 'live') {
        m.min = Math.min(90, m.min + (2 + Math.floor(Math.random() * 3)));
        if (Math.random() < 0.18) m.score[Math.random() < 0.5 ? 0 : 1] += 1; // occasional goal
        if (m.min >= 90) m.status = 'finished';
      }
    });
    return this.state.map((m) => ({ ...m, score: [...m.score] }));
  },
};

async function getLiveMatches() {
  if (SCORES_MODE === 'api') {
    // ---- REAL feed (implement /api/scores on a backend) ----
    const res = await fetch(SCORES_API_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('scores api ' + res.status);
    const data = await res.json();
    // Reflect the backend's mode so the LiveStatus pill stays honest:
    // the server reports 'demo' until a real FOOTBALL_API_KEY is configured.
    if (data.mode) window.ScoresProvider.MODE = data.mode === 'demo' ? 'mock' : 'api';
    return { matches: data.matches || [], updatedAt: data.updatedAt || Date.now() };
  }
  // ---- MOCK feed ----
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250)); // simulate latency
  return { matches: _mock.tick(), updatedAt: Date.now() };
}

window.ScoresProvider = { MODE: SCORES_MODE, API_URL: SCORES_API_URL, getLiveMatches };

/* ============================================================
   Kickoff localization — convert an ET wall-clock 'HH:MM' (anchored
   to today in America/New_York) into the visitor's local timezone.
   Returns { time:'HH:MM', tz:'PST', dayTag:''|'Tomorrow'|weekday }.
   ============================================================ */
function _etPartsToday() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (t) => +p.find((x) => x.type === t).value;
  return { y: get('year'), mo: get('month'), d: get('day') };
}
// UTC ms for a wall-clock time in a given IANA zone
function _zonedToUTC(y, mo, d, h, mi, timeZone) {
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess));
    const g = (t) => +p.find((x) => x.type === t).value;
    let gh = g('hour'); if (gh === 24) gh = 0;
    const wall = Date.UTC(g('year'), g('month') - 1, g('day'), gh, g('minute'));
    guess += Date.UTC(y, mo - 1, d, h, mi) - wall;
  }
  return guess;
}
function localKickoff(hhmmET, opts) {
  const allowPast = !opts || opts.allowPast !== false;
  const [h, m] = String(hhmmET).split(':').map(Number);
  const { y, mo, d } = _etPartsToday();
  const utc = _zonedToUTC(y, mo, d, h, m, 'America/New_York');
  const date = new Date(utc);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(date).find((x) => x.type === 'timeZoneName').value;
  // day tag relative to the viewer's "today"
  const localDay = (z) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(z);
  const kickDay = localDay(date), today = localDay(new Date());
  const diff = Math.round((Date.parse(kickDay) - Date.parse(today)) / 86400000);
  let dayTag = '';
  if (diff === 1) dayTag = 'Tomorrow';
  else if (diff === -1) dayTag = allowPast ? 'Yesterday' : '';
  else if (diff !== 0) dayTag = (diff < 0 && !allowPast) ? '' : new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return { time, tz: tzName, dayTag };
}
window.localKickoff = localKickoff;
