/* ============================================================
   Sensi World Cup — live scores React layer
   useLiveScores(): polls ScoresProvider, exposes matches + meta.
   LiveStatus: the "updated 8s ago" pill (loading / live / stale / error).
   ============================================================ */

function useLiveScores(intervalMs = 9000) {
  const [matches, setMatches] = React.useState(() => window.TODAY_MATCHES || []);
  const [updatedAt, setUpdatedAt] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const mounted = React.useRef(true);

  const refresh = React.useCallback(async () => {
    try {
      const { matches: m, updatedAt: u } = await window.ScoresProvider.getLiveMatches();
      if (!mounted.current) return;
      setMatches(m); setUpdatedAt(u); setError(null); setLoading(false);
    } catch (e) {
      if (!mounted.current) return;
      setError(e.message || 'feed error'); setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => { mounted.current = false; clearInterval(t); };
  }, [refresh, intervalMs]);

  const byId = React.useMemo(() => {
    const o = {}; matches.forEach((m) => (o[m.id] = m)); return o;
  }, [matches]);

  const anyLive = matches.some((m) => m.status === 'live');
  return { matches, byId, updatedAt, loading, error, anyLive, refresh, mode: window.ScoresProvider.MODE };
}

function LiveStatus({ live }) {
  const [, force] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  let dot = 'rgba(255,255,255,.3)', label, color = 'rgba(255,255,255,.45)';
  const ago = live.updatedAt ? Math.round((Date.now() - live.updatedAt) / 1000) : null;
  const stale = ago != null && ago > 40;

  if (live.error) { dot = '#fb7185'; color = '#fb7185'; label = 'Feed offline · retrying'; }
  else if (live.loading) { dot = 'var(--accent)'; color = 'var(--accent)'; label = 'Connecting…'; }
  else if (live.anyLive) { dot = 'var(--pitch)'; color = 'var(--pitch)'; label = stale ? `Updated ${ago}s ago` : `Live · updated ${ago}s ago`; }
  else { dot = 'rgba(255,255,255,.4)'; label = ago != null ? `Updated ${ago}s ago` : 'Idle'; }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(255,255,255,.05)', color }}>
      <span className={`w-1.5 h-1.5 rounded-full ${live.anyLive && !live.error ? 'animate-pulse' : ''}`} style={{ background: dot }} />
      {label}
      {live.mode === 'mock' && <span className="text-white/30 font-medium">· demo feed</span>}
    </span>
  );
}

Object.assign(window, { useLiveScores, LiveStatus });
