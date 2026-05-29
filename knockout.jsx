/* ============================================================
   Sensi World Cup — Knockout bracket renderer
   ============================================================ */

function computeBracket(rankings, koPicks, allLocked) {
  const teams = {};   // matchId -> {a, b}  (codes or null)
  const winner = {};  // matchId -> code or null
  const loser = {};   // matchId -> code or null

  // assign the 8 best 3rd-placed teams to their wildcard slots
  const thirdByMatch = {};
  if (allLocked) {
    const thirds = window.GROUP_KEYS
      .map((g) => ({ g, code: rankings[g][2], power: window.POWER[rankings[g][2]] || 50 }))
      .sort((a, b) => b.power - a.power)
      .slice(0, 8);
    const used = new Set();
    const slots = window.KO_R32.filter((m) => m.b.third)
      .map((m) => ({ id: m.id, allowed: m.b.third }))
      .sort((a, b) => a.allowed.length - b.allowed.length);
    for (const s of slots) {
      const pick = thirds.find((t) => !used.has(t.code) && s.allowed.includes(t.g));
      if (pick) { used.add(pick.code); thirdByMatch[s.id] = pick.code; }
    }
  }

  const resolve = (slot, matchId) => {
    if (typeof slot === 'number') return winner[slot] || null;        // feed from earlier match
    if (slot.seed) { const r = rankings[slot.g]; return (r && r.length >= slot.seed) ? r[slot.seed - 1] : null; }
    if (slot.third) return thirdByMatch[matchId] || null;
    return null;
  };

  window.KO_ROUNDS.forEach((round) => {
    round.matches.forEach((m) => {
      const a = resolve(m.a, m.id), b = resolve(m.b, m.id);
      teams[m.id] = { a, b };
      const p = koPicks[m.id];
      winner[m.id] = (p && (p === a || p === b)) ? p : null;
      loser[m.id] = winner[m.id] ? (winner[m.id] === a ? b : a) : null;
    });
  });

  // Bronze final — losers of the two semis
  const bz = window.KO_BRONZE;
  const ba = loser[bz.a] || null, bb = loser[bz.b] || null;
  teams[bz.id] = { a: ba, b: bb };
  const bp = koPicks[bz.id];
  winner[bz.id] = (bp && (bp === ba || bp === bb)) ? bp : null;

  return {
    teams, winner, loser,
    champion: winner[window.KO_FINAL.id] || null,
    bronze: winner[bz.id] || null,
  };
}

function KoSlot({ code, label, isWinner, decided, clickable, onClick }) {
  if (!code) {
    return (
      <div className="flex items-center gap-2 px-2.5 h-[28px]">
        <span className="w-[18px] h-[18px] rounded-full border border-dashed border-white/20 shrink-0" />
        <span className="text-[11px] font-semibold text-white/30">{label}</span>
      </div>
    );
  }
  return (
    <button onClick={clickable ? onClick : undefined}
      className={`${clickable ? 'press' : ''} w-full flex items-center gap-2 px-2.5 h-[28px] text-left min-w-0`}
      style={{ cursor: clickable ? 'pointer' : 'default', opacity: decided && !isWinner ? 0.42 : 1, transition: 'opacity .2s ease' }}>
      <FlagChip code={code} size={18} selected={isWinner} />
      <span className="text-[12px] font-bold truncate" title={window.teamName(code)} style={{ color: isWinner ? 'var(--pitch)' : '#fff' }}>{window.teamName(code)}</span>
      {isWinner && <Icon name="Check" size={12} className="ml-auto shrink-0" style={{ color: 'var(--pitch)' }} />}
    </button>
  );
}

function KMatch({ m, teams, winner, labelA, labelB, onPick, fullWidth }) {
  const { a, b } = teams;
  const both = !!(a && b);
  const w = winner;
  return (
    <div className="rounded-xl border overflow-hidden shrink-0"
      style={{
        width: fullWidth ? '100%' : 158,
        background: w ? 'linear-gradient(145deg, rgba(16,185,129,.1), rgba(255,255,255,.03))' : 'rgba(255,255,255,.035)',
        borderColor: w ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.1)',
        transition: 'background .25s ease, border-color .25s ease',
      }}>
      <KoSlot code={a} label={labelA} isWinner={w === a} decided={!!w} clickable={both} onClick={() => onPick(m.id, a)} />
      <div className="h-px bg-white/8" />
      <KoSlot code={b} label={labelB} isWinner={w === b} decided={!!w} clickable={both} onClick={() => onPick(m.id, b)} />
    </div>
  );
}

function KnockoutBracket({ rankings, koPicks, onPick, onReset, lockedGroups }) {
  const allLocked = lockedGroups === 12;
  const [mobileRound, setMobileRound] = React.useState(0);
  const { teams, winner, champion } = React.useMemo(
    () => computeBracket(rankings, koPicks, allLocked),
    [rankings, koPicks, allLocked]
  );

  if (lockedGroups === 0) {
    return (
      <GlassCard className="p-8 grid place-items-center text-center gap-3">
        <div className="grid place-items-center w-14 h-14 rounded-2xl" style={{ background: 'rgba(56,189,248,.12)' }}>
          <Icon name="GitFork" size={24} style={{ color: 'var(--accent)' }} className="rotate-90" />
        </div>
        <h3 className="text-white font-bold text-[16px]">Your knockout bracket is waiting</h3>
        <p className="text-white/45 text-[13px] max-w-sm">Lock group standings on the Group Stage tab — winners, runners-up and the 8 best third-placed teams flow straight into these Round of 32 lines.</p>
      </GlassCard>
    );
  }

  const picksMade = Object.keys(koPicks).filter((id) => winner[id]).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1.5 text-white/55">
            <Icon name="ListChecks" size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-white/75 tabular-nums">{lockedGroups}/12</span> groups locked
          </span>
          {!allLocked && (
            <span className="flex items-center gap-1.5 text-white/40">
              <Icon name="Lock" size={12} />Wildcard slots unlock at 12
            </span>
          )}
          <span className="text-white/40 tabular-nums hidden sm:inline">· {picksMade} ties called</span>
        </div>
        {picksMade > 0 && (
          <button onClick={onReset} className="press text-[12px] font-semibold text-white/45 hover:text-white/70 transition flex items-center gap-1.5">
            <Icon name="RotateCcw" size={13} />Reset knockout
          </button>
        )}
      </div>

      {/* champion banner */}
      <div className="rounded-2xl border mb-4 px-4 py-3 flex items-center gap-3"
        style={{
          background: champion ? 'linear-gradient(120deg, rgba(251,191,36,.16), rgba(255,255,255,.03))' : 'rgba(255,255,255,.03)',
          borderColor: champion ? 'rgba(251,191,36,.45)' : 'rgba(255,255,255,.1)',
          transition: 'background .3s ease, border-color .3s ease',
        }}>
        <div className="grid place-items-center w-11 h-11 rounded-xl shrink-0"
          style={{ background: champion ? 'linear-gradient(140deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,.06)' }}>
          <Icon name="Trophy" size={20} style={{ color: champion ? '#3a2a06' : 'rgba(255,255,255,.3)' }} stroke={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Your predicted champion</div>
          {champion ? (
            <div className="flex items-center gap-2 mt-0.5">
              <FlagChip code={champion} size={22} />
              <span className="font-black text-[16px] text-white">{window.TEAMS[champion].name}</span>
            </div>
          ) : (
            <div className="text-[13px] text-white/45 mt-0.5">Call every tie to crown a winner.</div>
          )}
        </div>
      </div>

      {/* MOBILE: round stepper + single round stacked */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/8 bg-black/20 mb-3">
          {window.KO_ROUNDS.map((r, i) => (
            <button key={r.key} onClick={() => setMobileRound(i)} aria-label={r.label}
              className="press flex-1 whitespace-nowrap px-1.5 py-2 rounded-lg text-[12px] font-bold"
              style={{ background: i === mobileRound ? 'rgba(255,255,255,.08)' : 'transparent', color: i === mobileRound ? '#fff' : 'rgba(255,255,255,.5)', border: i === mobileRound ? '1px solid rgba(255,255,255,.1)' : '1px solid transparent' }}>
              {r.key}
            </button>
          ))}
        </div>
        <GlassCard className="p-3">
          <div className="flex items-center justify-center gap-2 pb-2">
            <button onClick={() => setMobileRound((r) => Math.max(0, r - 1))} disabled={mobileRound === 0} aria-label="Previous round"
              className="press grid place-items-center w-7 h-7 rounded-full bg-white/5 disabled:opacity-30"><Icon name="ChevronLeft" size={15} /></button>
            <span className="text-[11px] uppercase tracking-widest text-white/55 font-bold">{window.KO_ROUNDS[mobileRound].label}</span>
            <button onClick={() => setMobileRound((r) => Math.min(window.KO_ROUNDS.length - 1, r + 1))} disabled={mobileRound === window.KO_ROUNDS.length - 1} aria-label="Next round"
              className="press grid place-items-center w-7 h-7 rounded-full bg-white/5 disabled:opacity-30"><Icon name="ChevronRight" size={15} /></button>
          </div>
          <div className="space-y-2">
            {window.KO_ROUNDS[mobileRound].matches.map((m) => {
              const labelA = typeof m.a === 'number' ? '—' : window.slotLabel(m.a);
              const labelB = typeof m.b === 'number' ? '—' : window.slotLabel(m.b);
              return <KMatch key={m.id} m={m} teams={teams[m.id]} winner={winner[m.id]} labelA={labelA} labelB={labelB} onPick={onPick} fullWidth />;
            })}
          </div>
        </GlassCard>
      </div>

      {/* DESKTOP: full scrollable bracket canvas */}
      <GlassCard className="hidden sm:block p-3 overflow-auto" style={{ maxHeight: '74vh' }}>
        <div className="flex gap-5" style={{ height: 1080, minWidth: 900 }}>
          {window.KO_ROUNDS.map((round) => (
            <div key={round.key} className="flex flex-col shrink-0" style={{ width: 158 }}>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold text-center pb-2 sticky top-0 z-10">
                {round.label}
              </div>
              <div className="flex-1 flex flex-col justify-around">
                {round.matches.map((m) => {
                  const labelA = typeof m.a === 'number' ? '—' : window.slotLabel(m.a);
                  const labelB = typeof m.b === 'number' ? '—' : window.slotLabel(m.b);
                  return (
                    <KMatch key={m.id} m={m} teams={teams[m.id]} winner={winner[m.id]}
                      labelA={labelA} labelB={labelB} onPick={onPick} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Bronze final */}
      <div className="mt-3 rounded-2xl border border-white/10 p-3 flex items-center gap-3 flex-wrap"
        style={{ background: 'rgba(205,127,50,.08)' }}>
        <div className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(205,127,50,.18)' }}>
          <Icon name="Medal" size={18} style={{ color: '#cd7f32' }} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Bronze Final · 3rd place</div>
          <div className="text-[12px] text-white/45">Semi-final losers play off for the podium.</div>
        </div>
        <div className="ml-auto">
          <KMatch m={window.KO_BRONZE} teams={teams[window.KO_BRONZE.id]} winner={winner[window.KO_BRONZE.id]}
            labelA="SF loser" labelB="SF loser" onPick={onPick} />
        </div>
      </div>

      <p className="text-[11px] text-white/35 mt-2 flex items-center gap-1.5">
        <Icon name="Hand" size={12} />Tap a team to advance it. Scroll to see every round through the Final.
      </p>
    </div>
  );
}

Object.assign(window, { KnockoutBracket, computeBracket });
