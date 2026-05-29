/* ============================================================
   Sensi World Cup — Sticky header: progress ring, phase toggle,
   live "Stadium Pitch" widget (Phase B)
   ============================================================ */

function MiniPitch() {
  return (
    <div className="relative rounded-xl overflow-hidden shrink-0"
      style={{ width: 96, height: 60, background: 'linear-gradient(135deg, #0f7a4a, #0b5e3a)' }}>
      <div className="absolute inset-0 opacity-30"
        style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.12) 0 12px, transparent 12px 24px)' }} />
      <div className="absolute inset-1.5 border border-white/40 rounded-sm" />
      <div className="absolute top-1.5 bottom-1.5 left-1/2 w-px bg-white/40 -translate-x-1/2" />
      <div className="absolute top-1/2 left-1/2 w-5 h-5 border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <span className="ball-drift absolute top-0 left-0 w-2 h-2 rounded-full bg-white shadow" />
    </div>
  );
}

function LivePitch({ matches }) {
  const list = matches || window.TODAY_MATCHES;
  const liveMatch = list.find((m) => m.status === 'live') || list[0];
  const [pts, setPts] = React.useState(34);
  const [flux, setFlux] = React.useState(2);
  React.useEffect(() => {
    const t = setInterval(() => {
      const d = Math.random() < 0.55 ? 1 : -1;
      setFlux(d * (1 + Math.floor(Math.random() * 3)));
      setPts((p) => Math.max(0, p + (Math.random() < 0.6 ? 1 : 0)));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-hidden fade-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3">
        <div className="rounded-2xl border border-white/10 p-3 flex items-center gap-4 flex-wrap"
          style={{ background: 'linear-gradient(110deg, rgba(15,122,74,.22), rgba(255,255,255,.03))' }}>
          <MiniPitch />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <FlagChip code={liveMatch.home} size={30} />
              <span className="text-[11px] font-bold text-white">{liveMatch.home}</span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white tabular-nums leading-none">{liveMatch.score[0]}–{liveMatch.score[1]}</div>
              <span className="flex items-center gap-1 justify-center mt-1 text-[10px] font-bold" style={{ color: '#fb7185' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />LIVE {liveMatch.min}'
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FlagChip code={liveMatch.away} size={30} />
              <span className="text-[11px] font-bold text-white">{liveMatch.away}</span>
            </div>
          </div>

          <div className="h-10 w-px bg-white/10 hidden sm:block" />

          <div className="ml-auto flex items-center gap-5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold whitespace-nowrap">Matchday points</div>
              <div className="relative" style={{ height: 30 }}>
                <span className="block text-2xl font-black tabular-nums leading-none" style={{ color: 'var(--pitch)' }}>+{pts}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex items-center gap-1 whitespace-nowrap">
                In flux <Icon name="Activity" size={11} />
              </div>
              <div className="relative" style={{ height: 26 }}>
                <span className="text-xl font-black tabular-nums flex items-center gap-1 leading-none"
                  style={{ color: flux >= 0 ? 'var(--pitch)' : '#fb7185' }}>
                  <Icon name={flux >= 0 ? 'TrendingUp' : 'TrendingDown'} size={16} />
                  {flux >= 0 ? '+' : ''}{flux}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid place-items-center w-10 h-10 rounded-xl shrink-0"
        style={{ background: 'linear-gradient(140deg, var(--accent), var(--pitch))', boxShadow: '0 4px 16px color-mix(in oklab, var(--accent) 45%, transparent)' }}>
        <Icon name="Trophy" size={20} className="text-[#06121f]" stroke={2.4} />
      </div>
      <div className="leading-none">
        <div className="font-black text-white text-[15px] tracking-tight flex items-center gap-1.5 whitespace-nowrap">
          Sensi <span style={{ color: 'var(--accent)' }}>World Cup</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mt-1 whitespace-nowrap">2026 · Office Bracket</div>
      </div>
    </div>
  );
}

function StickyHeader({ phase, setPhase, bracketPct, lockedGroups, liveMatches, user }) {
  const me = user || { name: 'You', dept: 'R&D' };
  return (
    <header className="sticky top-0 z-40 border-b border-white/8"
      style={{ background: 'rgba(8,12,24,.78)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <BrandMark />

        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Segmented value={phase} onChange={setPhase} className="hidden sm:inline-flex"
            options={[
              { value: 'A', label: 'Pre-Tournament', icon: 'ListChecks' },
              { value: 'B', label: 'Matchday', icon: 'Radio' },
            ]} />

          <div className="flex items-center gap-2.5">
            <ProgressRing value={bracketPct} size={46} stroke={5}>
              <span className="text-[11px] font-black text-white tabular-nums">{Math.round(bracketPct * 100)}%</span>
            </ProgressRing>
            <div className="hidden md:block leading-tight">
              <div className="text-[12px] font-bold text-white whitespace-nowrap">Bracket Locked</div>
              <div className="text-[11px] text-white/45 tabular-nums whitespace-nowrap">{lockedGroups}/12 groups</div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block" />

          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-[12.5px] font-bold text-white whitespace-nowrap">{me.name}</div>
              <div className="text-[11px] whitespace-nowrap" style={{ color: window.DEPT_ACCENT[me.dept] || '#38bdf8' }}>{me.dept}</div>
            </div>
            <Avatar name={me.name} dept={me.dept} size={38} you />
          </div>
        </div>
      </div>

      <div className="sm:hidden px-4 pb-2 flex justify-center">
        <Segmented value={phase} onChange={setPhase}
          options={[{ value: 'A', label: 'Pre-Tournament', icon: 'ListChecks' }, { value: 'B', label: 'Matchday', icon: 'Radio' }]} />
      </div>

      {phase === 'B' && <LivePitch matches={liveMatches} />}
    </header>
  );
}

Object.assign(window, { StickyHeader });
