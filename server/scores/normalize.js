/* ============================================================
   Sensi World Cup — normalization helpers
   Map provider-specific fields into the app's normalized schema.
   ============================================================ */
import { codeFor } from './teamMap.js';

/* Provider "round" strings vary wildly:
     "Group A", "Group Stage - 1", "1st Round - Group A",
     "Round of 32", "Final", ...
   We want a single 'A'..'L' letter for group games, or a short KO
   tag ('R32','R16','QF','SF','F','3RD') for knockout games. */
export function normalizeGroup(round) {
  const s = String(round || '');
  // explicit "Group X"
  const g = s.match(/group\s*[-:]?\s*([A-L])\b/i);
  if (g) return g[1].toUpperCase();
  // knockout rounds
  if (/round of 32|1\/16/i.test(s)) return 'R32';
  if (/round of 16|1\/8|eighth/i.test(s)) return 'R16';
  if (/quarter/i.test(s)) return 'QF';
  if (/semi/i.test(s)) return 'SF';
  if (/3rd place|third place|bronze/i.test(s)) return '3RD';
  if (/final/i.test(s)) return 'F';
  // last resort: a lone capital letter A–L somewhere in the string
  const lone = s.match(/\b([A-L])\b/);
  return lone ? lone[1].toUpperCase() : '';
}

// API-Football short status -> our three buckets
const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT']);
const FINISHED = new Set(['FT', 'AET', 'PEN', 'WO']);
export function normalizeStatus(short) {
  if (short === 'NS' || short === 'TBD' || short === 'PST' || short === 'CANC' || short === 'SUSP') return 'upcoming';
  if (FINISHED.has(short)) return 'finished';
  if (LIVE.has(short)) return 'live';
  return 'upcoming';
}

// ISO/epoch kickoff -> 'HH:MM' in US Eastern (the app's reference zone)
export function kickoffET(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(/^24:/, '00:');
}

export { codeFor };
