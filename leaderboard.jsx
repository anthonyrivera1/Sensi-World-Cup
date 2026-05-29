/* ============================================================
   Sensi World Cup — Leaderboard (individual / department),
   momentum trend, banter dropdown w/ reactions
   ============================================================ */

const REACTIONS = [
  { id: 'yellow', label: 'Yellow Card', emoji: '🟨' },
  { id: 'var', label: 'VAR Review', emoji: '📺' },
  { id: 'clap', label: 'Respect', emoji: '👏' },
  { id: 'goat', label: 'GOAT', emoji: '🐐' },
];

function PlayerRow({ player, rank, expanded, onToggle }) {
  const [bursts, setBursts] = React.useState([]);
  const [counts, setCounts] = React.useState({});
  function react(r) {
    const key = Math.random();
    setBursts((b) => [...b, { key, emoji: r.emoji, x: 20 + Math.random() * 60 + '%' }]);
    setCounts((c) => ({ ...c, [r.id]: (c[r.id] || 0) + 1 }));
    setTimeout(() => setBursts((b) => b.filter((x) => x.key !== key)), 1000);
  }
  const medal = rank <= 3;
  const medalColor = ['#fbbf24', '#cbd5e1', '#d8a05a'][rank - 1];

  return (
    <div className="relative rounded-xl border overflow-hidden"
      style={{
        background: player.you ? 'linear-gradient(135deg, rgba(56,189,248,.14), rgba(255,255,255,.03))' : 'rgba(255,255,255,.03)',
        borderColor: player.you ? 'rgba(56,189,248,.45)' : 'rgba(255,255,255,.07)',
      }}>
      {/* burst layer */}
      <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
        {bursts.map((b) => (
          <span key={b.key} className="float-up absolute text-xl" style={{ left: b.x, top: '50%' }}>{b.emoji}</span>
        ))}
      </div>

      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <span className="w-7 grid place-items-center font-black text-[15px] tabular-nums shrink-0"
          style={{ color: medal ? medalColor : 'rgba(255,255,255,.4)' }}>
          {medal ? <Icon name="Medal" size={18} style={{ color: medalColor }} /> : rank}
        </span>
        <Avatar name={player.name} dept={player.dept} size={36} you={player.you} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[13.5px] text-white truncate">{player.name}</span>
            {player.you && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#06121f' }}>YOU</span>}
            {player.streak >= 2 && (
              <span className="flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                title={`${player.streak}-matchday exact-score streak`}
                style={{ background: 'rgba(251,146,60,.16)', color: '#fb923c' }}>🔥{player.streak}</span>
            )}
          </div>
          <span className="text-[11px] font-medium" style={{ color: window.DEPT_ACCENT[player.dept] }}>{player.dept}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black text-[15px] text-white tabular-nums">{player.score.toLocaleString()}</div>
          <div className="flex items-center justify-end gap-1.5">
            {player.live && (
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--pitch)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
              </span>
            )}
            <MomentumIndicator delta={player.delta} compact />
          </div>
        </div>
        <Icon name="ChevronDown" size={16} className="text-white/30 shrink-0"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} />
      </button>

      <div className={`collapsible ${expanded ? 'open' : ''}`}>
        <div className="collapsible-inner">
          <div className="px-3 pb-3 pt-2 border-t border-white/8 flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 font-semibold">Champion</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                <FlagChip code={player.champ} size={20} />
                <span className="text-[12px] font-bold text-white">{player.champ}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 font-semibold">Exact scores</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-[12px] font-bold text-white">
                <Icon name="Target" size={13} style={{ color: 'var(--pitch)' }} />{player.exact}
                <span className="text-white/35 font-medium">· +{player.exact * 2} bonus</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40 font-semibold">Streak</span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold"
                style={{ background: player.streak >= 2 ? 'rgba(251,146,60,.14)' : 'rgba(255,255,255,.05)', color: player.streak >= 2 ? '#fb923c' : 'rgba(255,255,255,.55)' }}>
                {player.streak > 0 ? `🔥 ${player.streak} matchday${player.streak > 1 ? 's' : ''}` : 'No streak'}
              </span>
            </div>
            {player.live && player.breakdown && (
              <div className="flex items-center gap-2 w-full">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--pitch)' }}>Live from your picks</span>
                <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/65 flex-wrap">
                  Season so far <b className="text-white">{player.breakdown.base}</b>
                  <span className="text-white/25">·</span> Groups <b className="text-white">{player.breakdown.group}</b>
                  <span className="text-white/25">·</span> Knockout <b className="text-white">{player.breakdown.knockout}</b>
                  <span className="text-white/25">·</span> Matchday <b className="text-white">{player.breakdown.matchday}</b>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              {REACTIONS.map((r) => (
                <button key={r.id} onClick={() => react(r)} title={r.label}
                  className="press hscale relative flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
                  <span className="text-[15px] leading-none">{r.emoji}</span>
                  {counts[r.id] > 0 && <span className="text-[10px] font-bold text-white/60 tabular-nums">{counts[r.id]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeptRow({ dept, avg, rank, max, count }) {
  const accent = window.DEPT_ACCENT[dept] || '#38bdf8';
  const pct = (avg / max) * 100;
  return (
    <div className="rounded-xl border border-white/7 px-3.5 py-3" style={{ background: 'rgba(255,255,255,.03)' }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-6 font-black text-[15px] tabular-nums" style={{ color: rank === 1 ? '#fbbf24' : 'rgba(255,255,255,.4)' }}>{rank}</span>
        <span className="grid place-items-center w-9 h-9 rounded-xl font-black text-[13px] shrink-0"
          style={{ background: `${accent}22`, color: accent }}>{dept.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13.5px] text-white truncate">{dept}</div>
          <div className="text-[11px] text-white/40">{count} player{count > 1 ? 's' : ''}</div>
        </div>
        <div className="text-right">
          <div className="font-black text-[16px] text-white tabular-nums">{Math.round(avg).toLocaleString()}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">avg pts</div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-black/30 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: pct + '%', background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 60%, #fff))`, transition: 'width .9s cubic-bezier(.22,1,.36,1)' }} />
      </div>
    </div>
  );
}

function Leaderboard({ liveScore, breakdown, players: rosterPlayers, departments: rosterDepts }) {
  const [view, setView] = React.useState('individual');
  const [open, setOpen] = React.useState(null);

  const roster = rosterPlayers || window.PLAYERS;
  const deptList = rosterDepts || window.DEPARTMENTS;
  const players = roster.map((p) => (
    p.you && liveScore != null ? { ...p, score: liveScore, live: true, breakdown } : p
  ));
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const depts = deptList.map((d) => {
    const members = players.filter((p) => p.dept === d);
    const avg = members.length ? members.reduce((s, p) => s + p.score, 0) / members.length : 0;
    return { dept: d, avg, count: members.length };
  }).filter((d) => d.count > 0).sort((a, b) => b.avg - a.avg);
  const maxAvg = Math.max(1, ...depts.map((d) => d.avg));

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon name="Trophy" size={17} style={{ color: '#fbbf24' }} />
          <h3 className="text-white font-bold text-[15px]">Bragging Rights</h3>
        </div>
        <Segmented value={view} onChange={(v) => { setView(v); setOpen(null); }}
          options={[
            { value: 'individual', label: 'Individual', icon: 'User' },
            { value: 'dept', label: 'Dept vs Dept', icon: 'Users' },
          ]} />
      </div>

      {view === 'individual' ? (
        <div key="ind" className="fade-up">
          <p className="text-[11.5px] text-white/45 mb-2.5 flex items-center gap-x-3 gap-y-1 flex-wrap">
            <span className="flex items-center gap-1"><Icon name="Target" size={12} style={{ color: 'var(--pitch)' }} /> exact-score hits</span>
            <span className="flex items-center gap-1">🔥 bonus streak</span>
            <span className="text-white/30">·</span>
            <span className="text-white/40">Outcome <span className="text-white/60 font-semibold">3 pts</span> · Exact score <span className="font-semibold" style={{ color: 'var(--pitch)' }}>+2 bonus</span></span>
          </p>
          <div className="space-y-1.5">
            {sorted.map((p, i) => (
              <PlayerRow key={p.id} player={p} rank={i + 1}
                expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </div>
        </div>
      ) : (
        <div key="dept" className="space-y-2 fade-up">
          <p className="text-[12px] text-white/45 mb-1 flex items-center gap-1.5">
            <Icon name="Swords" size={13} style={{ color: 'var(--accent)' }} />
            Ranked by <span className="text-white/70 font-semibold">average score</span> — every teammate counts.
          </p>
          {depts.map((d, i) => (
            <DeptRow key={d.dept} dept={d.dept} avg={d.avg} count={d.count} rank={i + 1} max={maxAvg} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

Object.assign(window, { Leaderboard });
