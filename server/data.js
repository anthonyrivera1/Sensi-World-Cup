/* ============================================================
   Sensi World Cup — server-side canonical data
   Mirrors the parts of the frontend data.js the backend needs:
   group keys, departments, dept accents, and the demo roster used
   when Okta is not configured.
   ============================================================ */
export const GROUP_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const DEPARTMENTS = ['Sales', 'Finance', 'R&D', 'Product', 'Customer Success', 'Operations'];

export const DEPT_ACCENT = {
  'Sales': '#f59e0b',
  'Finance': '#10b981',
  'R&D': '#38bdf8',
  'Product': '#a78bfa',
  'Customer Success': '#f472b6',
  'Operations': '#fb923c',
};

// Demo roster (used only when Okta is not configured) — identical to the
// prototype's PLAYERS so the leaderboard looks the same out of the box.
export const DEMO_PLAYERS = [
  { id: 'p1',  name: 'Maya Cohen',    dept: 'R&D',              score: 1284, delta: 3,  champ: 'BRA', exact: 14, streak: 4, you: false },
  { id: 'p2',  name: 'Diego Alvarez', dept: 'Sales',            score: 1262, delta: 8,  champ: 'ARG', exact: 11, streak: 6, you: false },
  { id: 'p3',  name: 'Priya Nair',    dept: 'Product',          score: 1241, delta: -1, champ: 'FRA', exact: 12, streak: 0, you: false },
  { id: 'p4',  name: 'Tom Becker',    dept: 'Finance',          score: 1218, delta: 0,  champ: 'GER', exact: 9,  streak: 2, you: false },
  { id: 'p5',  name: 'You',           dept: 'R&D',              score: 1196, delta: 5,  champ: 'ESP', exact: 8,  streak: 3, you: true  },
  { id: 'p6',  name: 'Lena Schulz',   dept: 'Operations',       score: 1174, delta: -3, champ: 'NED', exact: 10, streak: 0, you: false },
  { id: 'p7',  name: 'Omar Haddad',   dept: 'Customer Success', score: 1158, delta: 2,  champ: 'POR', exact: 7,  streak: 1, you: false },
  { id: 'p8',  name: 'Grace Park',    dept: 'Product',          score: 1131, delta: 11, champ: 'ENG', exact: 6,  streak: 5, you: false },
  { id: 'p9',  name: 'Yossi Levi',    dept: 'Sales',            score: 1109, delta: -2, champ: 'BRA', exact: 8,  streak: 0, you: false },
  { id: 'p10', name: 'Ana Ferreira',  dept: 'Finance',          score: 1082, delta: 1,  champ: 'POR', exact: 9,  streak: 2, you: false },
  { id: 'p11', name: 'Ravi Menon',    dept: 'R&D',              score: 1054, delta: -6, champ: 'ARG', exact: 5,  streak: 0, you: false },
  { id: 'p12', name: 'Sara Klein',    dept: 'Customer Success', score: 1031, delta: 4,  champ: 'ESP', exact: 6,  streak: 1, you: false },
  { id: 'p13', name: 'Noa Bar',       dept: 'Operations',       score: 1008, delta: -4, champ: 'FRA', exact: 7,  streak: 0, you: false },
  { id: 'p14', name: 'Felix Dubois',  dept: 'Sales',            score: 977,  delta: 7,  champ: 'NED', exact: 4,  streak: 3, you: false },
];

// Map an Okta department/group string into one of our six buckets.
// Unknown departments pass through unchanged (the UI falls back to a
// default accent for anything not in DEPT_ACCENT).
const DEPT_NORMALIZE = {
  'sales': 'Sales',
  'finance': 'Finance', 'accounting': 'Finance',
  'r&d': 'R&D', 'rd': 'R&D', 'research': 'R&D', 'research & development': 'R&D', 'engineering': 'R&D',
  'product': 'Product', 'product management': 'Product',
  'customer success': 'Customer Success', 'cs': 'Customer Success', 'support': 'Customer Success',
  'operations': 'Operations', 'ops': 'Operations',
};
export function normalizeDept(dept) {
  if (!dept) return 'Operations';
  const key = String(dept).toLowerCase().trim();
  return DEPT_NORMALIZE[key] || dept;
}
