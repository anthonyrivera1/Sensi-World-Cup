/* ============================================================
   Sensi World Cup — provider team name -> 3-letter code map
   ------------------------------------------------------------
   The whole app keys off the 3-letter codes in data.js -> TEAMS.
   Providers (API-Football etc.) use their own full team names,
   and they are NOT always identical to ours. This module maps
   any provider name to the correct code, tolerant of accents,
   punctuation, casing, and common naming variants.

   Covers all 48 FWC26 teams. If a provider sends an unknown name
   we fall back to an upper-cased 3-letter slice (and log it) so a
   missing alias degrades gracefully instead of dropping the match.
   ============================================================ */

// canonical code -> every name a provider might send for it
const ALIASES = {
  // GROUP A
  MEX: ['Mexico'],
  RSA: ['South Africa'],
  KOR: ['Korea Republic', 'South Korea', 'Korea Rep.', 'Republic of Korea', 'Korea'],
  CZE: ['Czechia', 'Czech Republic'],
  // GROUP B
  CAN: ['Canada'],
  BIH: ['Bosnia and Herzegovina', 'Bosnia & Herzegovina', 'Bosnia and Herzegovina IF', 'Bosnia'],
  QAT: ['Qatar'],
  SUI: ['Switzerland'],
  // GROUP C
  BRA: ['Brazil'],
  MAR: ['Morocco'],
  HAI: ['Haiti'],
  SCO: ['Scotland'],
  // GROUP D
  USA: ['USA', 'United States', 'United States of America'],
  PAR: ['Paraguay'],
  AUS: ['Australia'],
  TUR: ['Turkey', 'Turkiye', 'Türkiye'],
  // GROUP E
  GER: ['Germany'],
  CUW: ['Curacao', 'Curaçao'],
  CIV: ['Ivory Coast', "Cote d'Ivoire", "Côte d'Ivoire", 'Cote dIvoire'],
  ECU: ['Ecuador'],
  // GROUP F
  NED: ['Netherlands', 'Holland'],
  JPN: ['Japan'],
  SWE: ['Sweden'],
  TUN: ['Tunisia'],
  // GROUP G
  BEL: ['Belgium'],
  EGY: ['Egypt'],
  IRN: ['Iran', 'IR Iran', 'Iran Islamic Republic'],
  NZL: ['New Zealand'],
  // GROUP H
  ESP: ['Spain'],
  CPV: ['Cape Verde', 'Cabo Verde', 'Cape Verde Islands'],
  KSA: ['Saudi Arabia'],
  URU: ['Uruguay'],
  // GROUP I
  FRA: ['France'],
  SEN: ['Senegal'],
  IRQ: ['Iraq'],
  NOR: ['Norway'],
  // GROUP J
  ARG: ['Argentina'],
  ALG: ['Algeria'],
  AUT: ['Austria'],
  JOR: ['Jordan'],
  // GROUP K
  POR: ['Portugal'],
  COD: ['Congo DR', 'DR Congo', 'Democratic Republic of the Congo', 'Congo Democratic Republic', 'Congo-Kinshasa'],
  UZB: ['Uzbekistan'],
  COL: ['Colombia'],
  // GROUP L
  ENG: ['England'],
  CRO: ['Croatia'],
  GHA: ['Ghana'],
  PAN: ['Panama'],
};

// all valid codes (single source of truth for completeness checks/tests)
export const CODES = Object.keys(ALIASES);

// strip accents, punctuation, collapse whitespace, lowercase
function normalize(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// build reverse lookup: normalized alias -> code (also map the code itself)
const LOOKUP = new Map();
for (const [code, names] of Object.entries(ALIASES)) {
  LOOKUP.set(normalize(code), code);
  for (const n of names) LOOKUP.set(normalize(n), code);
}

const _unmapped = new Set();

/**
 * Resolve a provider team name to our 3-letter code.
 * Falls back to a 3-letter upper-case slice for unknown names so a
 * single missing alias never drops a whole match from the feed.
 */
export function codeFor(providerName) {
  const key = normalize(providerName);
  if (LOOKUP.has(key)) return LOOKUP.get(key);
  if (!_unmapped.has(key) && key) {
    _unmapped.add(key);
    console.warn(`[teamMap] no code for provider team "${providerName}" — falling back to slice`);
  }
  return String(providerName || '???').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '???';
}

export function unmappedNames() {
  return [..._unmapped];
}
