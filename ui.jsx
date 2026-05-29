/* ============================================================
   Sensi World Cup — shared UI primitives (CSS animations)
   ============================================================ */

/* ---- Icon (renders a lucide icon node array) ---- */
function Icon({ name, size = 20, stroke = 2, className = '', style = {} }) {
  const node = window.lucide[name];
  if (!node) return null;
  return React.createElement(
    'svg',
    {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round',
      strokeLinejoin: 'round', className, style, 'aria-hidden': true,
    },
    node.map((child, i) => React.createElement(child[0], { key: i, ...child[1] }))
  );
}

/* ---- FlagChip: stylized circular flag (offline, no images) ---- */
function FlagChip({ code, size = 38, className = '', selected = false }) {
  const t = window.TEAMS[code];
  if (!t) return null;
  const { colors, dir } = t;
  let bg;
  if (dir === 'dot') {
    bg = `radial-gradient(circle at 50% 50%, ${colors[1]} 0 30%, ${colors[0]} 31% 100%)`;
  } else {
    const angle = dir === 'h' ? '180deg' : dir === 'd' ? '135deg' : '90deg';
    const n = colors.length;
    const stops = colors
      .map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
      .join(', ');
    bg = `linear-gradient(${angle}, ${stops})`;
  }
  return (
    <span
      className={`relative inline-block rounded-full shrink-0 ${className}`}
      style={{
        width: size, height: size, background: bg,
        boxShadow: selected
          ? '0 0 0 2px var(--accent), 0 2px 8px rgba(0,0,0,.45)'
          : 'inset 0 0 0 1.5px rgba(255,255,255,.22), inset 0 -3px 6px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.4)',
      }}
    >
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.45) 0%, rgba(255,255,255,0) 42%)' }}
      />
    </span>
  );
}

/* ---- ProgressRing (CSS stroke transition) ---- */
function ProgressRing({ value = 0, size = 46, stroke = 5, color = 'var(--pitch)', track = 'rgba(255,255,255,.12)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          className="ring-arc"
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ filter: 'drop-shadow(0 0 5px color-mix(in oklab, #10b981 60%, transparent))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ---- GlassCard ---- */
function GlassCard({ className = '', style = {}, children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 ${className}`}
      style={{
        background: 'rgba(255,255,255,var(--glass-alpha))',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---- Avatar (initials) ---- */
function Avatar({ name, dept, size = 34, you = false }) {
  const initials = name === 'You' ? 'ME' : name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const accent = window.DEPT_ACCENT[dept] || '#38bdf8';
  return (
    <span
      className="grid place-items-center rounded-full font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        color: '#0a0f1d',
        background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 55%, #ffffff))`,
        boxShadow: you ? '0 0 0 2px var(--accent)' : 'inset 0 0 0 1px rgba(255,255,255,.25)',
      }}
    >
      {initials}
    </span>
  );
}

/* ---- MomentumIndicator ---- */
function MomentumIndicator({ delta, compact = false }) {
  const up = delta > 0, flat = delta === 0;
  const color = flat ? 'rgba(255,255,255,.4)' : up ? 'var(--pitch)' : '#fb7185';
  const ic = flat ? 'Minus' : up ? 'TrendingUp' : 'TrendingDown';
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums" style={{ color, fontSize: compact ? 11 : 12 }}>
      <Icon name={ic} size={compact ? 12 : 14} stroke={2.5} />
      {!flat && Math.abs(delta)}
    </span>
  );
}

/* ---- StatusDot ---- */
function StatusDot({ status, size = 9 }) {
  const map = {
    locked: { c: 'var(--pitch)', glow: true },
    progress: { c: '#fbbf24', glow: true },
    untouched: { c: 'rgba(255,255,255,.22)', glow: false },
  };
  const s = map[status] || map.untouched;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: s.c, boxShadow: s.glow ? `0 0 8px ${s.c}` : 'none' }}
    />
  );
}

/* ---- Pill button ---- */
function InfoPopover({ text, label = 'More info', align = 'center' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button aria-label={label} aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 140)}
        className="press grid place-items-center w-5 h-5 rounded-full"
        style={{ background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}>
        <Icon name="Info" size={12} />
      </button>
      {open && (
        <span className="absolute z-50 top-7 w-60 p-3 rounded-xl text-[11.5px] leading-relaxed text-white/75 border border-white/12 fade-up"
          style={{
            background: '#11192e', boxShadow: '0 12px 40px rgba(0,0,0,.55)',
            left: align === 'left' ? 0 : '50%', transform: align === 'left' ? 'none' : 'translateX(-50%)',
          }}>
          {text}
        </span>
      )}
    </span>
  );
}

/* ---- Segmented control (CSS active background) ---- */
function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`relative inline-flex p-1 rounded-full bg-black/30 border border-white/10 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="press relative px-3.5 py-1.5 rounded-full text-[13px] font-semibold z-10"
            style={{
              color: active ? '#06121f' : 'rgba(255,255,255,.6)',
              background: active ? 'var(--accent)' : 'transparent',
              boxShadow: active ? '0 2px 12px color-mix(in oklab, var(--accent) 60%, transparent)' : 'none',
              transition: 'background-color .25s ease, color .25s ease, box-shadow .25s ease',
            }}
          >
            <span className="relative inline-flex items-center gap-1.5">{o.icon && <Icon name={o.icon} size={14} />}{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  Icon, FlagChip, ProgressRing, GlassCard, Avatar, MomentumIndicator, StatusDot, Segmented, InfoPopover,
});
