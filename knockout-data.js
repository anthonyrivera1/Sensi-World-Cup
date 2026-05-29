/* ============================================================
   Sensi World Cup — Knockout bracket (Round of 32 → Final)
   Tree + slot specs taken from the official FWC26 schedule.
   Seeds resolve from the user's group rankings; the 8 best
   third-placed teams fill the wildcard slots automatically.
   ============================================================ */

// Round of 32 — each match has two slots.
//  seed: {seed:1|2, g:'A'}  → 1st/2nd of that group
//  third:[allowed groups]   → one of the 8 advancing 3rd-placed teams
// display order is already arranged so the tree lines up top→bottom.
const KO_R32 = [
  { id: 74, a: { seed: 1, g: 'E' }, b: { third: ['A', 'B', 'C', 'D', 'F'] } },
  { id: 77, a: { seed: 1, g: 'I' }, b: { third: ['C', 'D', 'F', 'G', 'H'] } },
  { id: 73, a: { seed: 2, g: 'A' }, b: { seed: 2, g: 'B' } },
  { id: 75, a: { seed: 1, g: 'F' }, b: { seed: 2, g: 'C' } },
  { id: 83, a: { seed: 2, g: 'K' }, b: { seed: 2, g: 'L' } },
  { id: 84, a: { seed: 1, g: 'H' }, b: { seed: 2, g: 'J' } },
  { id: 81, a: { seed: 1, g: 'D' }, b: { third: ['B', 'E', 'F', 'I', 'J'] } },
  { id: 82, a: { seed: 1, g: 'G' }, b: { third: ['A', 'E', 'H', 'I', 'J'] } },
  { id: 76, a: { seed: 1, g: 'C' }, b: { seed: 2, g: 'F' } },
  { id: 78, a: { seed: 2, g: 'E' }, b: { seed: 2, g: 'I' } },
  { id: 79, a: { seed: 1, g: 'A' }, b: { third: ['C', 'E', 'F', 'H', 'I'] } },
  { id: 80, a: { seed: 1, g: 'L' }, b: { third: ['E', 'H', 'I', 'J', 'K'] } },
  { id: 86, a: { seed: 1, g: 'J' }, b: { seed: 2, g: 'H' } },
  { id: 88, a: { seed: 2, g: 'D' }, b: { seed: 2, g: 'G' } },
  { id: 85, a: { seed: 1, g: 'B' }, b: { third: ['E', 'F', 'G', 'I', 'J'] } },
  { id: 87, a: { seed: 1, g: 'K' }, b: { third: ['D', 'E', 'I', 'J', 'L'] } },
];
const KO_R16 = [
  { id: 89, a: 74, b: 77 }, { id: 90, a: 73, b: 75 },
  { id: 93, a: 83, b: 84 }, { id: 94, a: 81, b: 82 },
  { id: 91, a: 76, b: 78 }, { id: 92, a: 79, b: 80 },
  { id: 95, a: 86, b: 88 }, { id: 96, a: 85, b: 87 },
];
const KO_QF = [
  { id: 97, a: 89, b: 90 }, { id: 98, a: 93, b: 94 },
  { id: 99, a: 91, b: 92 }, { id: 100, a: 95, b: 96 },
];
const KO_SF = [{ id: 101, a: 97, b: 98 }, { id: 102, a: 99, b: 100 }];
const KO_FINAL = { id: 104, a: 101, b: 102 };
const KO_BRONZE = { id: 103, a: 101, b: 102 }; // losers of the semi-finals

const KO_ROUNDS = [
  { key: 'R32', label: 'Round of 32', matches: KO_R32 },
  { key: 'R16', label: 'Round of 16', matches: KO_R16 },
  { key: 'QF', label: 'Quarter-finals', matches: KO_QF },
  { key: 'SF', label: 'Semi-finals', matches: KO_SF },
  { key: 'F', label: 'Final', matches: [KO_FINAL] },
];

// slot label for an unresolved seed/feed
function slotLabel(slot) {
  if (slot.seed) return slot.seed + slot.g;
  if (slot.third) return '3rd';
  return 'W' + slot; // feed from match id
}

Object.assign(window, { KO_R32, KO_R16, KO_QF, KO_SF, KO_FINAL, KO_BRONZE, KO_ROUNDS, slotLabel });
