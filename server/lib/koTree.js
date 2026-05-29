/* Knockout round membership (match id -> round key), mirrored from the
   frontend knockout-data.js so server-side scoring can weight KO picks. */
export const KO_ROUND_OF = (() => {
  const m = {};
  const R32 = [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87];
  const R16 = [89, 90, 93, 94, 91, 92, 95, 96];
  const QF = [97, 98, 99, 100];
  const SF = [101, 102];
  R32.forEach((id) => (m[id] = 'R32'));
  R16.forEach((id) => (m[id] = 'R16'));
  QF.forEach((id) => (m[id] = 'QF'));
  SF.forEach((id) => (m[id] = 'SF'));
  m[104] = 'F';
  m[103] = 'BRONZE';
  return m;
})();

export const KO_FINAL_ID = '104';
