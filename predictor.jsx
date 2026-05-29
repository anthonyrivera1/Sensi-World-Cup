/* ============================================================
   Sensi World Cup — Daily Match Predictor + Virtual Monkey
   Pick-first UX: one-tap winner (1 / X / 2), optional exact
   score for bonus points.
   ============================================================ */

const PTS_OUTCOME = 3;   // correct winner / draw
const PTS_EXACT = 2;     // bonus for exact scoreline

function outcomeOf(score) {
  if (!score) return null;
  return score[0] > score[1] ? 'home' : score[0] < score[1] ? 'away' : 'draw';
}

function Stepper({ value, onChange, color, disabled }) {
  const btn = (dir, icon, dis) => (
    <button
      disabled={dis || disabled}
      aria-label={dir > 0 ? 'Increase score' : 'Decrease score'}
      onClick={() => !disabled && onChange(Math.max(0, Math.min(9, value + dir)))}
      className={`${disabled ? '' : 'press hscale'} grid place-items-center w-11 h-11 rounded-full border`}
      style={{
        background: 'rgba(255,255,255,.06)',
        borderColor: 'rgba(255,255,255,.12)',
        color: (dis || disabled) ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.85)',
        cursor: (dis || disabled) ? 'default' : 'pointer',
      }}
    >
      <Icon name={icon} size={18} stroke={2.6} />
    </button>
  );
  return (
    <div className="flex items-center gap-2.5">
      {btn(-1, 'Minus', value <= 0)}
      <div className="w-7 grid place-items-center" style={{ height: 32 }}>
        <span className="text-2xl font-black tabular-nums leading-none" style={{ color }}>{value}</span>
      </div>
      {btn(1, 'Plus', value >= 9)}
    </div>
  );
}

/* one of the three pick targets (Home / Draw / Away) */
function PickTarget({ kind, code, selected, dim, disabled, onClick }) {
  const accent = 'var(--accent)';
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className={`${disabled ? '' : 'press'} relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 px-2`}
      style={{
        flex: kind === 'draw' ? '0 0 78px' : '1 1 0',
        background: selected ? 'color-mix(in oklab, var(--accent) 16%, transparent)' : 'rgba(255,255,255,.03)',
        borderColor: selected ? accent : 'rgba(255,255,255,.1)',
        boxShadow: selected ? '0 0 0 1px var(--accent), 0 4px 18px color-mix(in oklab, var(--accent) 40%, transparent)' : 'none',
        opacity: dim && !selected ? (disabled ? 0.32 : 0.5) : 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background .2s ease, border-color .2s ease, box-shadow .2s ease, opacity .2s ease',
      }}>
      {selected && (
        <span className="absolute top-1.5 right-1.5 grid place-items-center w-4 h-4 rounded-full"
          style={{ background: accent, color: '#06121f' }}>
          <Icon name="Check" size={11} stroke={3} />
        </span>
      )}
      {kind === 'draw' ? (
        <>
          <span className="grid place-items-center w-9 h-9 rounded-full font-black text-[15px]"
            style={{ background: 'rgba(255,255,255,.08)', color: selected ? accent : 'rgba(255,255,255,.7)' }}>X</span>
          <span className="text-[11px] font-bold" style={{ color: selected ? accent : 'rgba(255,255,255,.6)' }}>Draw</span>
        </>
      ) : (
        <>
          <FlagChip code={code} size={40} selected={selected} />
          <span className="text-[12px] font-bold text-white text-center leading-tight">{window.teamName(code)}</span>
        </>
      )}
    </button>
  );
}

function MatchCard({ match, pred, locked, monkey, bracketPick, setOutcome, setScore, setLock }) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const kickedOff = isLive || isFinished;            // picks + scores lock the moment a game starts
  const fromBracket = !!bracketPick;
  const outcomeLocked = locked || fromBracket || kickedOff;
  const editLocked = locked || kickedOff;            // blocks score edits, the toggle, and the lock button
  const monkeyFilled = !pred && monkey && !fromBracket && !kickedOff;
  const monkeyPick = React.useRef(['home', 'draw', 'away'][Math.floor(Math.random() * 3)]);
  const [pulse, setPulse] = React.useState(false);
  const [showScore, setShowScore] = React.useState(!!(pred && pred.score));

  const pick = bracketPick || (pred && pred.pick) || (monkeyFilled ? monkeyPick.current : null);
  const score = pred && pred.score;
  const stepScore = score || [0, 0];

  // keep the matchday outcome in sync with the bracket ranking — until kickoff
  React.useEffect(() => {
    if (fromBracket && !locked && !kickedOff && (!pred || pred.pick !== bracketPick)) setOutcome(match.id, bracketPick);
  }, [bracketPick, locked]);

  // once the game is live, finalize the pick the user already made: it can no
  // longer be changed (the backend enforces the same lock authoritatively).
  React.useEffect(() => {
    if (kickedOff && !locked && pred && pred.pick) setLock(match.id);
  }, [kickedOff]);

  // an exact score may never contradict a bracket-locked winner
  const onScore = (id, sc) => {
    if (fromBracket) {
      let [h, a] = sc;
      if (bracketPick === 'home' && h <= a) h = Math.min(9, a + 1);
      if (bracketPick === 'away' && a <= h) a = Math.min(9, h + 1);
      if (bracketPick === 'home' && h <= a) a = Math.max(0, h - 1);
      if (bracketPick === 'away' && a <= h) h = Math.max(0, a - 1);
      setScore(id, [h, a]);
    } else setScore(id, sc);
  };

  function lock() {
    if (locked || kickedOff) return;
    if (fromBracket) setOutcome(match.id, bracketPick);
    else if (!pred && monkeyFilled) setOutcome(match.id, monkeyPick.current);
    setLock(match.id);
    setPulse(true);
    setTimeout(() => setPulse(false), 760);
  }

  const ready = !!pick;

  return (
    <div
      className={`rounded-2xl border p-4 ${pulse ? 'glow-pulse' : ''}`}
      style={{
        background: locked ? 'linear-gradient(145deg, rgba(16,185,129,.12), rgba(255,255,255,.03))' : 'rgba(255,255,255,var(--glass-alpha))',
        borderColor: locked ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.1)',
        backdropFilter: 'blur(var(--glass-blur))', WebkitBackdropFilter: 'blur(var(--glass-blur))',
        transition: 'background .3s ease, border-color .3s ease',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-white/45">
          <span className="grid place-items-center w-5 h-5 rounded font-black text-[10px]"
            style={{ background: 'rgba(255,255,255,.08)', color: 'var(--accent)' }}>{match.group}</span>
          {match.venue}
        </span>
        <span className="flex items-center gap-2">
          {isLive && (
            <span className="text-[11px] font-bold text-white/70 tabular-nums">{match.score[0]}–{match.score[1]}</span>
          )}
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,.18)', color: '#fb7185' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />LIVE {match.min}'
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-white/40 flex items-center gap-1">
              <Icon name="Clock" size={12} />
              {(() => { const k = window.localKickoff(match.kickoff, { allowPast: false }); return <>{k.dayTag && <span className="text-white/55">{k.dayTag} </span>}{k.time} {k.tz}</>; })()}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-white/35 font-bold flex items-center gap-1.5">
          {outcomeLocked && <Icon name="Lock" size={10} style={{ color: fromBracket && !locked && !kickedOff ? 'var(--accent)' : 'var(--pitch)' }} />}
          {locked ? 'Pick locked'
            : kickedOff ? (isFinished ? 'Locked · full time' : 'Locked · in play')
            : fromBracket ? 'Set by your bracket'
            : 'Pick the winner'}
        </span>
        <span className="text-[10px] font-semibold text-white/35">{PTS_OUTCOME} pts</span>
      </div>

      {/* 1 / X / 2 picker */}
      <div className="flex items-stretch gap-2">
        <PickTarget kind="home" code={match.home} selected={pick === 'home'} dim={!!pick} disabled={outcomeLocked}
          onClick={() => setOutcome(match.id, 'home')} />
        <PickTarget kind="draw" selected={pick === 'draw'} dim={!!pick} disabled={outcomeLocked}
          onClick={() => setOutcome(match.id, 'draw')} />
        <PickTarget kind="away" code={match.away} selected={pick === 'away'} dim={!!pick} disabled={outcomeLocked}
          onClick={() => setOutcome(match.id, 'away')} />
      </div>

      {fromBracket && !locked && (
        <p className="text-[10.5px] mt-2 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <Icon name="GitFork" size={11} className="rotate-90" />
          Locked to your Group {match.group} ranking — {window.TEAMS[bracketPick === 'home' ? match.home : match.away].name} finishes higher.
        </p>
      )}

      {/* optional exact score */}
      {!(editLocked && !score) && (
      <button onClick={() => !editLocked && setShowScore((v) => !v)} disabled={editLocked}
        className={`${editLocked ? '' : 'press'} w-full mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border text-[12px] font-semibold`}
        style={{
          background: score ? 'color-mix(in oklab, var(--pitch) 12%, transparent)' : 'rgba(255,255,255,.03)',
          borderColor: score ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.1)',
          color: score ? 'var(--pitch)' : 'rgba(255,255,255,.6)',
          cursor: editLocked ? 'default' : 'pointer',
          transition: 'background .2s ease, border-color .2s ease, color .2s ease',
        }}>
        <Icon name={score ? 'CircleCheckBig' : showScore ? 'Minus' : 'Plus'} size={14} />
        {score ? `Exact score${editLocked ? '' : ' predicted'} · ${score[0]}–${score[1]}` : 'Add exact score'}
        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,.08)', color: score ? 'var(--pitch)' : 'var(--accent)' }}>
          <Icon name="Star" size={10} />+{PTS_EXACT} bonus
        </span>
      </button>
      )}

      <div className={`collapsible ${showScore ? 'open' : ''}`}>
        <div className="collapsible-inner">
          <div className="flex items-center justify-around pt-3 pb-1">
            <div className="flex flex-col items-center gap-1.5">
              <FlagChip code={match.home} size={26} />
              <Stepper value={stepScore[0]} color="var(--accent)" disabled={editLocked} onChange={(v) => onScore(match.id, [v, stepScore[1]])} />
            </div>
            <span className="text-white/25 font-black text-lg pt-5">–</span>
            <div className="flex flex-col items-center gap-1.5">
              <FlagChip code={match.away} size={26} />
              <Stepper value={stepScore[1]} color="var(--accent)" disabled={editLocked} onChange={(v) => onScore(match.id, [stepScore[0], v])} />
            </div>
          </div>
          {score && !editLocked && (
            <p className="text-[10.5px] text-white/40 text-center pb-1">
              Implies a <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                {outcomeOf(score) === 'draw' ? 'draw' : (outcomeOf(score) === 'home' ? match.home : match.away) + ' win'}
              </span> — your pick updates to match.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {monkeyFilled && !locked && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full fade-in"
            style={{ background: 'rgba(251,191,36,.14)', color: '#fbbf24' }}>
            🦙 Llama picked {monkeyPick.current === 'draw' ? 'Draw' : monkeyPick.current === 'home' ? match.home : match.away}
          </span>
        )}
        <button
          onClick={lock}
          disabled={editLocked || !ready}
          className={`${editLocked || !ready ? '' : 'press'} ml-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[12.5px]`}
          style={{
            background: locked ? 'rgba(16,185,129,.18)' : (kickedOff || !ready) ? 'rgba(255,255,255,.06)' : 'var(--accent)',
            color: locked ? 'var(--pitch)' : (kickedOff || !ready) ? 'rgba(255,255,255,.4)' : '#06121f',
            boxShadow: !editLocked && ready ? '0 3px 14px color-mix(in oklab, var(--accent) 55%, transparent)' : 'none',
            cursor: editLocked || !ready ? 'default' : 'pointer',
            transition: 'background .25s ease, color .25s ease',
          }}>
          <Icon name={locked ? 'CircleCheckBig' : 'Lock'} size={14} />
          {locked ? 'Locked in'
            : kickedOff ? (isFinished ? 'Full time' : 'Kicked off')
            : ready ? 'Lock pick'
            : 'Pick a winner'}
        </button>
      </div>
    </div>
  );
}

function DailyPredictor({ state, setState, rankings, matches, live }) {
  const { preds, locked, monkey } = state;
  const fixtures = matches || window.TODAY_MATCHES;

  const bracketOutcome = (match) => {
    const r = (rankings || {})[match.group];
    if (!r) return null;
    const ih = r.indexOf(match.home), ia = r.indexOf(match.away);
    if (ih < 0 || ia < 0) return null;
    return ih < ia ? 'home' : 'away';
  };

  const setOutcome = (id, outcome) => setState((s) => {
    const cur = s.preds[id] || {};
    let score = cur.score;
    if (score && outcomeOf(score) !== outcome) score = null; // clear contradicting score
    return { ...s, preds: { ...s.preds, [id]: { pick: outcome, score: score || null } } };
  });
  const setScore = (id, sc) => setState((s) => ({
    ...s, preds: { ...s.preds, [id]: { pick: outcomeOf(sc), score: sc } },
  }));
  const setLock = (id) => setState((s) => ({ ...s, locked: { ...s.locked, [id]: true } }));
  const setMonkey = (v) => setState((s) => ({ ...s, monkey: v }));
  const lockedCount = Object.keys(locked).length;

  return (
    <div>
      <GlassCard className="p-4 mb-4 flex items-center gap-4"
        style={{ background: monkey ? 'linear-gradient(135deg, rgba(251,191,36,.12), rgba(255,255,255,.03))' : 'rgba(255,255,255,var(--glass-alpha))', borderColor: monkey ? 'rgba(251,191,36,.35)' : undefined, transition: 'background .3s ease, border-color .3s ease' }}>
        <div className={`grid place-items-center w-12 h-12 rounded-2xl text-2xl shrink-0 ${monkey ? 'wiggle' : ''}`}
          style={{ background: 'rgba(251,191,36,.16)' }}>🦙</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-[14px] flex items-center gap-2 flex-wrap">
            <span className="whitespace-nowrap">Virtual Llama</span> <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--accent)' }}>SAFETY NET</span>
          </h3>
          <p className="text-white/50 text-[12px] mt-0.5">
            {monkey
              ? 'On — if you miss a lock time, the office mascot picks a winner for you so you never take a 0-point day.'
              : 'Off — miss a matchday lock and those matches score zero.'}
          </p>
        </div>
        <button onClick={() => setMonkey(!monkey)} className="press relative w-14 h-8 rounded-full shrink-0"
          style={{ background: monkey ? 'var(--pitch)' : 'rgba(255,255,255,.14)', transition: 'background .25s ease' }}>
          <span className="absolute top-1 w-6 h-6 rounded-full bg-white shadow"
            style={{ left: monkey ? 'calc(100% - 28px)' : '4px', transition: 'left .28s cubic-bezier(.34,1.4,.64,1)' }} />
        </button>
      </GlassCard>

      <div className="flex items-center justify-between mb-3 px-1 gap-3 flex-wrap">
        <h3 className="text-white font-bold text-[15px] flex items-center gap-2">
          <Icon name="CalendarDays" size={16} style={{ color: 'var(--accent)' }} />
          Today's Matches
        </h3>
        <div className="flex items-center gap-2.5">
          {live && <LiveStatus live={live} />}
          <span className="text-[12px] text-white/45 font-semibold tabular-nums">{lockedCount}/{fixtures.length} locked</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {fixtures.map((m, i) => (
          <div key={m.id} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <MatchCard match={m}
              pred={preds[m.id]} locked={!!locked[m.id]} monkey={monkey} bracketPick={bracketOutcome(m)}
              setOutcome={setOutcome} setScore={setScore} setLock={setLock} />
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DailyPredictor });
