/* ============================================================
   Sensi World Cup 2026 — Data layer
   Real groups + teams from the official FWC26 schedule.
   Office / leaderboard data is mock.
   Exposes globals on window.
   ============================================================ */

// dir: 'v' vertical bands | 'h' horizontal bands | 'd' diagonal | 'dot' (field + center disc)
const TEAMS = {
  // GROUP A
  MEX: { name: 'Mexico',        colors: ['#006847', '#ffffff', '#ce1126'], dir: 'v' },
  RSA: { name: 'South Africa',  colors: ['#007a4d', '#ffb612', '#de3831'], dir: 'h' },
  KOR: { name: 'South Korea',    colors: ['#ffffff', '#003478', '#c60c30'], dir: 'h' },
  CZE: { name: 'Czechia',       colors: ['#11457e', '#ffffff', '#d7141a'], dir: 'h' },
  // GROUP B
  CAN: { name: 'Canada',        colors: ['#d52b1e', '#ffffff', '#d52b1e'], dir: 'v' },
  BIH: { name: 'Bosnia and Herzegovina',   colors: ['#002395', '#fecb00', '#ffffff'], dir: 'd' },
  QAT: { name: 'Qatar',         colors: ['#8a1538', '#ffffff'],            dir: 'v' },
  SUI: { name: 'Switzerland',   colors: ['#d52b1e', '#ffffff', '#d52b1e'], dir: 'h' },
  // GROUP C
  BRA: { name: 'Brazil',        colors: ['#009b3a', '#ffdf00', '#002776'], dir: 'd' },
  MAR: { name: 'Morocco',       colors: ['#c1272d', '#006233'],            dir: 'v' },
  HAI: { name: 'Haiti',         colors: ['#00209f', '#d21034'],            dir: 'h' },
  SCO: { name: 'Scotland',      colors: ['#0065bd', '#ffffff'],            dir: 'd' },
  // GROUP D
  USA: { name: 'United States',           colors: ['#3c3b6e', '#ffffff', '#b22234'], dir: 'v' },
  PAR: { name: 'Paraguay',      colors: ['#d52b1e', '#ffffff', '#0038a8'], dir: 'h' },
  AUS: { name: 'Australia',     colors: ['#00008b', '#ffffff', '#e4002b'], dir: 'd' },
  TUR: { name: 'Turkey',       colors: ['#e30a17', '#ffffff'],            dir: 'dot' },
  // GROUP E
  GER: { name: 'Germany',       colors: ['#000000', '#dd0000', '#ffce00'], dir: 'h' },
  CUW: { name: 'Curaçao',       colors: ['#002b7f', '#f9d90f', '#ffffff'], dir: 'h' },
  CIV: { name: 'Ivory Coast', colors: ['#f77f00', '#ffffff', '#009e60'], dir: 'v' },
  ECU: { name: 'Ecuador',       colors: ['#ffd100', '#0072c6', '#ef3340'], dir: 'h' },
  // GROUP F
  NED: { name: 'Netherlands',   colors: ['#ae1c28', '#ffffff', '#21468b'], dir: 'h' },
  JPN: { name: 'Japan',         colors: ['#ffffff', '#bc002d'],            dir: 'dot' },
  SWE: { name: 'Sweden',        colors: ['#006aa7', '#fecc00'],            dir: 'd' },
  TUN: { name: 'Tunisia',       colors: ['#e70013', '#ffffff'],            dir: 'dot' },
  // GROUP G
  BEL: { name: 'Belgium',       colors: ['#000000', '#fdda24', '#ef3340'], dir: 'v' },
  EGY: { name: 'Egypt',         colors: ['#ce1126', '#ffffff', '#000000'], dir: 'h' },
  IRN: { name: 'Iran',       colors: ['#239f40', '#ffffff', '#da0000'], dir: 'h' },
  NZL: { name: 'New Zealand',   colors: ['#00247d', '#cc142b', '#ffffff'], dir: 'd' },
  // GROUP H
  ESP: { name: 'Spain',         colors: ['#aa151b', '#f1bf00', '#aa151b'], dir: 'h' },
  CPV: { name: 'Cape Verde',    colors: ['#003893', '#ffffff', '#cf2027'], dir: 'h' },
  KSA: { name: 'Saudi Arabia',  colors: ['#006c35', '#ffffff'],            dir: 'v' },
  URU: { name: 'Uruguay',       colors: ['#0038a8', '#ffffff', '#fcd116'], dir: 'd' },
  // GROUP I
  FRA: { name: 'France',        colors: ['#002395', '#ffffff', '#ed2939'], dir: 'v' },
  SEN: { name: 'Senegal',       colors: ['#00853f', '#fdef42', '#e31b23'], dir: 'v' },
  IRQ: { name: 'Iraq',          colors: ['#ce1126', '#ffffff', '#000000'], dir: 'h' },
  NOR: { name: 'Norway',        colors: ['#ba0c2f', '#ffffff', '#00205b'], dir: 'd' },
  // GROUP J
  ARG: { name: 'Argentina',     colors: ['#74acdf', '#ffffff', '#74acdf'], dir: 'h' },
  ALG: { name: 'Algeria',       colors: ['#006233', '#ffffff', '#d21034'], dir: 'v' },
  AUT: { name: 'Austria',       colors: ['#ed2939', '#ffffff', '#ed2939'], dir: 'h' },
  JOR: { name: 'Jordan',        colors: ['#000000', '#ffffff', '#007a3d'], dir: 'h' },
  // GROUP K
  POR: { name: 'Portugal',      colors: ['#006600', '#ff0000'],            dir: 'v' },
  COD: { name: 'DR Congo',      colors: ['#007fff', '#f7d618', '#ce1021'], dir: 'd' },
  UZB: { name: 'Uzbekistan',    colors: ['#1eb53a', '#ffffff', '#0099b5'], dir: 'h' },
  COL: { name: 'Colombia',      colors: ['#fcd116', '#003893', '#ce1126'], dir: 'h' },
  // GROUP L
  ENG: { name: 'England',       colors: ['#ffffff', '#cf142b'],            dir: 'd' },
  CRO: { name: 'Croatia',       colors: ['#ff0000', '#ffffff', '#171796'], dir: 'h' },
  GHA: { name: 'Ghana',         colors: ['#ce1126', '#fcd116', '#006b3f'], dir: 'h' },
  PAN: { name: 'Panama',        colors: ['#db0000', '#ffffff', '#005293'], dir: 'd' },
};

const GROUPS = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};
const GROUP_KEYS = Object.keys(GROUPS);

// "Today's" matchday fixtures (real FWC26 group-stage pairings)
const TODAY_MATCHES = [
  { id: 'm1', group: 'C', home: 'BRA', away: 'MAR', kickoff: '15:00', venue: 'Los Angeles', status: 'live',     min: 67, score: [1, 0] },
  { id: 'm2', group: 'E', home: 'GER', away: 'CIV', kickoff: '16:00', venue: 'Atlanta',     status: 'live',     min: 23, score: [0, 0] },
  { id: 'm3', group: 'I', home: 'FRA', away: 'SEN', kickoff: '18:00', venue: 'New York NJ', status: 'upcoming', min: 0,  score: [0, 0] },
  { id: 'm4', group: 'H', home: 'ESP', away: 'KSA', kickoff: '21:00', venue: 'Dallas',      status: 'upcoming', min: 0,  score: [0, 0] },
  { id: 'm5', group: 'J', home: 'ARG', away: 'AUT', kickoff: '21:00', venue: 'Kansas City', status: 'upcoming', min: 0,  score: [0, 0] },
];

const DEPARTMENTS = ['Sales', 'Finance', 'R&D', 'Product', 'Customer Success', 'Operations'];

// Leaderboard — individuals (mock office). delta = rank change vs 3 days ago (+ = climbing)
// exact = total exact scorelines nailed (bonus points). streak = current matchdays in a row with >=1 exact.
const PLAYERS = [
  { id: 'p1',  name: 'Maya Cohen',      dept: 'R&D',              score: 1284, delta: 3,  champ: 'BRA', exact: 14, streak: 4, you: false },
  { id: 'p2',  name: 'Diego Alvarez',   dept: 'Sales',            score: 1262, delta: 8,  champ: 'ARG', exact: 11, streak: 6, you: false },
  { id: 'p3',  name: 'Priya Nair',      dept: 'Product',          score: 1241, delta: -1, champ: 'FRA', exact: 12, streak: 0, you: false },
  { id: 'p4',  name: 'Tom Becker',      dept: 'Finance',          score: 1218, delta: 0,  champ: 'GER', exact: 9,  streak: 2, you: false },
  { id: 'p5',  name: 'You',             dept: 'R&D',              score: 1196, delta: 5,  champ: 'ESP', exact: 8,  streak: 3, you: true  },
  { id: 'p6',  name: 'Lena Schulz',     dept: 'Operations',       score: 1174, delta: -3, champ: 'NED', exact: 10, streak: 0, you: false },
  { id: 'p7',  name: 'Omar Haddad',     dept: 'Customer Success', score: 1158, delta: 2,  champ: 'POR', exact: 7,  streak: 1, you: false },
  { id: 'p8',  name: 'Grace Park',      dept: 'Product',          score: 1131, delta: 11, champ: 'ENG', exact: 6,  streak: 5, you: false },
  { id: 'p9',  name: 'Yossi Levi',      dept: 'Sales',            score: 1109, delta: -2, champ: 'BRA', exact: 8,  streak: 0, you: false },
  { id: 'p10', name: 'Ana Ferreira',    dept: 'Finance',          score: 1082, delta: 1,  champ: 'POR', exact: 9,  streak: 2, you: false },
  { id: 'p11', name: 'Ravi Menon',      dept: 'R&D',              score: 1054, delta: -6, champ: 'ARG', exact: 5,  streak: 0, you: false },
  { id: 'p12', name: 'Sara Klein',      dept: 'Customer Success', score: 1031, delta: 4,  champ: 'ESP', exact: 6,  streak: 1, you: false },
  { id: 'p13', name: 'Noa Bar',         dept: 'Operations',       score: 1008, delta: -4, champ: 'FRA', exact: 7,  streak: 0, you: false },
  { id: 'p14', name: 'Felix Dubois',    dept: 'Sales',            score: 977,  delta: 7,  champ: 'NED', exact: 4,  streak: 3, you: false },
];

// avatar initials helper colors per dept
const DEPT_ACCENT = {
  'Sales': '#f59e0b',
  'Finance': '#10b981',
  'R&D': '#38bdf8',
  'Product': '#a78bfa',
  'Customer Success': '#f472b6',
  'Operations': '#fb923c',
};

Object.assign(window, { TEAMS, GROUPS, GROUP_KEYS, TODAY_MATCHES, DEPARTMENTS, PLAYERS, DEPT_ACCENT });
