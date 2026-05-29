/* ============================================================
   Sensi World Cup — Group stage: 12-group selector,
   two-tap ranking panel, 3rd-place wildcard automator
   ============================================================ */

const POWER = {
  ARG: 96, FRA: 95, ESP: 94, BRA: 93, ENG: 92, POR: 91, GER: 89, NED: 88,
  BEL: 86, URU: 84, CRO: 83, MAR: 82, SUI: 80, USA: 79, MEX: 78, COL: 78,
  SEN: 77, JPN: 76, KOR: 74, ECU: 72, AUS: 71, NOR: 71, EGY: 70, CIV: 69,
  SWE: 68, AUT: 68, NZL: 64, IRN: 66, GHA: 65, QAT: 63, CAN: 67, PAN: 60,
  SCO: 64, TUR: 70, TUN: 65, CZE: 67, RSA: 62, PAR: 63, ALG: 66, UZB: 60,
  KSA: 59, CPV: 55, COD: 58, IRQ: 57, HAI: 52, JOR: 56, BIH: 61, CUW: 50,
};

function groupStatus(ranking) {
  const n = (ranking || []).length;
  if (n >= 4) return 'locked';
  if (n >= 1) return 'progress';
  return 'untouched';
}

/* ---------- Group card ---------- */
function GroupCard({ letter, codes, ranking, onOpen }) {
  const status = groupStatus(ranking);
  const n = (ranking || []).length;
  const label = { locked: 'Locked', progress: `${n}/4 ranked`, untouched: 'Tap to rank' }[status];
  return (
    <button
      onClick={onOpen}
      className="lift press text-left relative rounded-2xl p-3.5 border overflow-hidden group"
      style={{
        background: status === 'locked'
          ? 'linear-gradient(145deg, rgba(16,185,129,.16), rgba(255,255,255,.04))'
          : 'rgba(255,255,255,var(--glass-alpha))',
        borderColor: status === 'locked' ? 'rgba(16,185,129,.45)' : 'rgba(255,255,255,.1)',
        backdropFilter: 'blur(var(--glass-blur))', WebkitBackdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      {status === 'locked' && (
        <span className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 24px rgba(16,185,129,.25)' }} />
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg font-black text-[15px]"
            style={{ background: 'rgba(255,255,255,.08)', color: 'var(--accent)' }}>{letter}</span>
          <span className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Group</span>
        </div>
        <StatusDot status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {codes.map((code) => {
          const pos = ranking ? ranking.indexOf(code) : -1;
          return (
            <div key={code} className="flex items-center gap-1.5">
              <span className="relative">
                <FlagChip code={code} size={24} />
                {pos > -1 && (
                  <span className="absolute -bottom-1 -right-1 grid place-items-center w-3.5 h-3.5 rounded-full text-[8px] font-black pop-in"
                    style={{ background: 'var(--pitch)', color: '#06121f' }}>{pos + 1}</span>
                )}
              </span>
              <span className="text-[11px] font-semibold text-white/70">{code}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold"
          style={{ color: status === 'locked' ? 'var(--pitch)' : status === 'progress' ? '#fbbf24' : 'rgba(255,255,255,.4)' }}>
          {label}
        </span>
        <Icon name={status === 'locked' ? 'CircleCheckBig' : 'ChevronRight'} size={15}
          className={status === 'locked' ? '' : 'text-white/30 group-hover:text-white/60 transition'}
          style={status === 'locked' ? { color: 'var(--pitch)' } : {}} />
      </div>
    </button>
  );
}

/* ---------- Two-tap ranking panel ---------- */
function RankingPanel({ letter, codes, ranking, onChange, onClose, onNext, hasNext }) {
  const [leaving, setLeaving] = React.useState(false);
  const ranked = ranking || [];
  const pool = codes.filter((c) => !ranked.includes(c));
  const slots = [0, 1, 2, 3];
  const slotMeta = [
    { label: '1st', color: '#fbbf24' },
    { label: '2nd', color: '#cbd5e1' },
    { label: '3rd', color: '#d8a05a' },
    { label: '4th', color: '#64748b' },
  ];

  function close() { setLeaving(true); setTimeout(onClose, 200); }
  function goNext() { setLeaving(true); setTimeout(onNext, 200); }
  function tapPool(code) { if (ranked.length < 4) onChange([...ranked, code]); }
  function tapRanked(code) { onChange(ranked.filter((c) => c !== code)); }

  const flagBtn = (code, ctx) => (
    <button
      key={code}
      onClick={() => (ctx === 'pool' ? tapPool(code) : tapRanked(code))}
      className="pop-in press hscale flex items-center gap-2.5 rounded-xl px-2.5 py-2 border w-full"
      style={{
        background: ctx === 'pool' ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)',
        borderColor: 'rgba(255,255,255,.1)',
      }}
    >
      <FlagChip code={code} size={32} />
      <span className="text-left leading-tight">
        <span className="block text-[13px] font-bold text-white">{code}</span>
        <span className="block text-[10px] text-white/45 -mt-0.5">{window.TEAMS[code].name}</span>
      </span>
      <Icon name={ctx === 'pool' ? 'Plus' : 'X'} size={15} className="ml-auto text-white/35" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${leaving ? 'fade-in' : 'overlay-in'}`}
        style={leaving ? { animation: 'fadeIn .2s reverse forwards' } : {}} onClick={close} />
      <div
        className={`relative w-full max-w-md rounded-3xl border border-white/12 overflow-hidden ${leaving ? 'modal-out' : 'modal-in'}`}
        style={{ background: 'linear-gradient(180deg, #11192e, #0a0f1d)', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl font-black text-xl"
              style={{ background: 'rgba(56,189,248,.14)', color: 'var(--accent)' }}>{letter}</span>
            <div>
              <h3 className="text-white font-bold text-[17px] leading-none">Rank Group {letter}</h3>
              <p className="text-white/45 text-[12px] mt-1">Tap teams to seed them 1 → 4</p>
            </div>
          </div>
          <button onClick={close} className="press grid place-items-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* pool */}
        <div className="px-5">
          <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-2">Tap to seed</p>
          <div className="min-h-[52px] grid grid-cols-2 gap-2 mb-4">
            {pool.map((c) => flagBtn(c, 'pool'))}
            {pool.length === 0 && (
              <div className="col-span-2 grid place-items-center py-3 text-[12px] text-white/40 gap-1 fade-up">
                <Icon name="CircleCheckBig" size={18} style={{ color: 'var(--pitch)' }} />
                Group fully ranked — nicely done.
              </div>
            )}
          </div>
        </div>

        {/* slots */}
        <div className="px-5 pb-4 space-y-2">
          {slots.map((i) => {
            const code = ranked[i];
            const meta = slotMeta[i];
            const advances = i < 2;
            return (
              <div key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2 border"
                style={{
                  background: code ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
                  borderColor: code ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)',
                  borderStyle: code ? 'solid' : 'dashed',
                  transition: 'background-color .2s ease, border-color .2s ease',
                }}>
                <span className="grid place-items-center w-9 h-9 rounded-lg font-black text-[13px] shrink-0"
                  style={{ background: 'rgba(255,255,255,.06)', color: meta.color }}>{meta.label}</span>
                <div className="flex-1 min-h-[40px] grid items-center">
                  {code ? flagBtn(code, 'ranked') : (
                    <span className="text-[12px] text-white/30">Tap a team above…</span>
                  )}
                </div>
                <span className="text-[10px] font-semibold shrink-0 text-right w-14"
                  style={{ color: advances ? 'var(--pitch)' : i === 2 ? '#d8a05a' : 'rgba(255,255,255,.3)' }}>
                  {advances ? 'Advances' : i === 2 ? '3rd-pl.' : 'Out'}
                </span>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-white/8 flex items-center gap-3" style={{ background: 'rgba(0,0,0,.2)' }}>
          <button onClick={() => onChange([])} className="press text-[12px] font-semibold text-white/45 hover:text-white/70 transition">Reset</button>
          <button onClick={ranked.length === 4 ? goNext : close}
            className="press ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px]"
            style={{
              background: ranked.length === 4 ? 'var(--pitch)' : 'rgba(255,255,255,.08)',
              color: ranked.length === 4 ? '#06121f' : 'rgba(255,255,255,.6)',
              boxShadow: ranked.length === 4 ? '0 4px 18px rgba(16,185,129,.4)' : 'none',
              transition: 'background-color .25s ease, color .25s ease',
            }}>
            <Icon name={ranked.length === 4 ? 'Lock' : 'Check'} size={15} />
            {ranked.length === 4 ? (hasNext ? 'Lock & next group' : 'Lock group') : 'Save draft'}
            {ranked.length === 4 && hasNext && <Icon name="ArrowRight" size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Group grid ---------- */
function GroupGrid({ rankings, onOpenGroup }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {window.GROUP_KEYS.map((g, i) => (
        <div key={g} className="fade-up" style={{ animationDelay: `${i * 30}ms` }}>
          <GroupCard letter={g} codes={window.GROUPS[g]} ranking={rankings[g]} onOpen={() => onOpenGroup(g)} />
        </div>
      ))}
    </div>
  );
}

/* ---------- 3rd-place wildcard automator ---------- */
function ThirdPlaceAutomator({ rankings }) {
  const thirds = window.GROUP_KEYS
    .map((g) => {
      const r = rankings[g] || [];
      return r.length >= 4 ? { g, code: r[2] } : null;
    })
    .filter(Boolean)
    .map((x) => ({ ...x, power: POWER[x.code] || 50 }))
    .sort((a, b) => b.power - a.power);

  const advancing = new Set(thirds.slice(0, 8).map((t) => t.code + t.g));

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Sparkles" size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-white font-bold text-[15px]">3rd-Place Wildcard Automator</h3>
          </div>
          <p className="text-white/45 text-[12px] max-w-sm">
            The 48-team format sends the <span className="text-white/70 font-semibold">8 best third-placed teams</span> to the Round of 32. We rank them for you — no math required.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-white/40 uppercase tracking-wider font-semibold whitespace-nowrap">Slots filled</div>
          <div className="font-black text-2xl tabular-nums" style={{ color: 'var(--pitch)' }}>
            {Math.min(thirds.length, 8)}<span className="text-white/30 text-base">/8</span>
          </div>
        </div>
      </div>

      {thirds.length === 0 ? (
        <div className="grid place-items-center gap-2 py-6 text-center">
          <Icon name="Lock" size={22} className="text-white/25" />
          <p className="text-[12px] text-white/40 max-w-[240px]">Lock your first group to start auto-filling the wildcard race.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {thirds.map((t, i) => {
            const isIn = advancing.has(t.code + t.g);
            return (
              <div key={t.g}
                className="pop-in relative flex items-center gap-2 rounded-xl px-2.5 py-2 border"
                style={{
                  background: isIn ? 'linear-gradient(135deg, rgba(16,185,129,.18), rgba(255,255,255,.03))' : 'rgba(255,255,255,.03)',
                  borderColor: isIn ? 'rgba(16,185,129,.5)' : 'rgba(255,255,255,.08)',
                  transition: 'background .3s ease, border-color .3s ease',
                }}>
                <span className="text-[10px] font-black w-4 text-center"
                  style={{ color: isIn ? 'var(--pitch)' : 'rgba(255,255,255,.3)' }}>{i + 1}</span>
                <FlagChip code={t.code} size={26} />
                <div className="leading-tight">
                  <div className="text-[12px] font-bold text-white">{t.code}</div>
                  <div className="text-[9px] text-white/40 -mt-0.5">3rd · Grp {t.g}</div>
                </div>
                {isIn && <Icon name="Check" size={13} className="ml-auto" style={{ color: 'var(--pitch)' }} />}
              </div>
            );
          })}
        </div>
      )}
      {thirds.length > 8 && (
        <p className="text-[11px] text-white/40 mt-3 flex items-center gap-1.5 fade-up">
          <Icon name="Info" size={12} />
          {thirds.length - 8} third-placed team{thirds.length - 8 > 1 ? 's' : ''} currently miss out as stronger groups lock in.
        </p>
      )}
    </GlassCard>
  );
}

Object.assign(window, { GroupGrid, RankingPanel, ThirdPlaceAutomator, groupStatus, POWER });
