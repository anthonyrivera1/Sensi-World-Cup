/* ============================================================
   Sensi World Cup — main app
   ============================================================ */
const LS_KEY = 'sensi-wc-2026';
function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#38bdf8",
  "glass": 50,
  "glow": true
}/*EDITMODE-END*/;

function TabBar({ tab, setTab, lockedGroups }) {
  const tabs = [
    { id: 'bracket', label: 'Bracket', icon: 'LayoutGrid', badge: `${lockedGroups}/12` },
    { id: 'predict', label: "Today's Matches", icon: 'Goal', badge: null },
    { id: 'board', label: 'Leaderboard', icon: 'Trophy', badge: null },
  ];
  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl border border-white/8 bg-black/20 w-full sm:w-auto">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="press relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{
              color: active ? '#fff' : 'rgba(255,255,255,.5)',
              background: active ? 'rgba(255,255,255,.08)' : 'transparent',
              border: active ? '1px solid rgba(255,255,255,.1)' : '1px solid transparent',
              transition: 'background .2s ease, color .2s ease, border-color .2s ease',
            }}>
            <Icon name={t.icon} size={16} style={active ? { color: 'var(--accent)' } : {}} />
            <span className="hidden xs:inline sm:inline whitespace-nowrap">{t.label}</span>
            {t.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums"
                style={{ background: 'rgba(255,255,255,.08)', color: active ? 'var(--pitch)' : 'rgba(255,255,255,.4)' }}>{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PhaseBanner({ phase }) {
  const a = phase === 'A';
  return (
    <div key={phase} className="flex items-center gap-2 text-[12.5px] fade-in">
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
        style={{ background: a ? 'rgba(56,189,248,.14)' : 'rgba(16,185,129,.16)', color: a ? 'var(--accent)' : 'var(--pitch)' }}>
        <Icon name={a ? 'ListChecks' : 'Radio'} size={13} />
        {a ? 'Phase A · Pre-Tournament' : 'Phase B · Active Matchday'}
      </span>
      <span className="text-white/45 hidden md:inline">
        {a ? 'Lock your master bracket before the opening whistle.' : 'Matches are live — your predictions are scoring in real time.'}
      </span>
    </div>
  );
}

function App() {
  const init = loadState();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [phase, setPhase] = React.useState(init.phase || 'A');
  const [tab, setTab] = React.useState(init.tab || 'bracket');
  const [rankings, setRankings] = React.useState(init.rankings || {});
  const [openGroup, setOpenGroup] = React.useState(null);
  const [bracketView, setBracketView] = React.useState(init.bracketView || 'groups');
  const [koPicks, setKoPicks] = React.useState(init.koPicks || {});
  const [predState, setPredState] = React.useState(init.predState || { preds: {}, locked: {}, monkey: false });
  const [introDismissed, setIntroDismissed] = React.useState(() => { try { return localStorage.getItem('sensi-wc-intro') === 'done'; } catch (e) { return false; } });
  function dismissIntro() { setIntroDismissed(true); try { localStorage.setItem('sensi-wc-intro', 'done'); } catch (e) {} }

  const lockedGroups = window.GROUP_KEYS.filter((g) => (rankings[g] || []).length >= 4).length;
  const bracketPct = lockedGroups / 12;
  const bracketScore = window.computeBracketScore({ rankings, koPicks, predState });
  const live = window.useLiveScores();
  const identity = window.useIdentity();

  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ phase, tab, rankings, predState, koPicks, bracketView }));
  }, [phase, tab, rankings, predState, koPicks, bracketView]);

  // apply tweaks -> CSS variables + ambient glow
  React.useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', t.accent);
    root.setProperty('--glass-alpha', (0.03 + (t.glass / 100) * 0.07).toFixed(3));
    root.setProperty('--glass-blur', (4 + (t.glass / 100) * 16).toFixed(0) + 'px');
    document.body.style.background = t.glow
      ? 'radial-gradient(1200px 700px at 78% -8%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%), radial-gradient(1000px 700px at 8% 4%, rgba(16,185,129,.12), transparent 55%), #070b16'
      : '#070b16';
  }, [t.accent, t.glass, t.glow]);

  function changePhase(p) { setPhase(p); setTab(p === 'B' ? 'predict' : 'bracket'); }
  function setGroupRanking(g, arr) { setRankings((r) => ({ ...r, [g]: arr })); }
  function setKoPick(matchId, code) { setKoPicks((k) => ({ ...k, [matchId]: code })); }

  return (
    <div className="min-h-screen">
      <StickyHeader phase={phase} setPhase={changePhase} bracketPct={bracketPct} lockedGroups={lockedGroups} liveMatches={live.matches} user={identity.user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {!introDismissed && (
          <div className="relative rounded-2xl border border-white/10 p-4 mb-5 fade-up"
            style={{ background: 'linear-gradient(120deg, rgba(56,189,248,.12), rgba(16,185,129,.08), rgba(255,255,255,.03))' }}>
            <button onClick={dismissIntro} aria-label="Dismiss welcome"
              className="press absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/55 transition">
              <Icon name="X" size={15} />
            </button>
            <div className="flex items-start gap-2 mb-3.5 pr-8">
              <Icon name="PartyPopper" size={16} style={{ color: 'var(--accent)' }} className="mt-0.5 shrink-0" />
              <h3 className="text-white font-bold text-[14.5px] leading-snug">Welcome — here’s how the Sensi World Cup works</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { n: 1, icon: 'LayoutGrid', t: 'Rank the groups', s: 'Two taps seeds each group 1–4.' },
                { n: 2, icon: 'GitFork', t: 'Fill the bracket', s: 'Advance teams to the Final.' },
                { n: 3, icon: 'Goal', t: 'Predict daily', s: 'Nail exact scores for bonus points.' },
                { n: 4, icon: 'Trophy', t: 'Climb the board', s: 'Outscore the whole office.' },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-white/8 p-2.5" style={{ background: 'rgba(255,255,255,.03)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="grid place-items-center w-5 h-5 rounded-full text-[10px] font-black" style={{ background: 'var(--accent)', color: '#06121f' }}>{step.n}</span>
                    <Icon name={step.icon} size={14} style={{ color: 'var(--accent)' }} />
                    <span className="text-[12.5px] font-bold text-white">{step.t}</span>
                  </div>
                  <p className="text-[11px] text-white/55 leading-snug">{step.s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <PhaseBanner phase={phase} />
          <TabBar tab={tab} setTab={setTab} lockedGroups={lockedGroups} />
        </div>

        {tab === 'bracket' && (
          <div key="bracket" className="space-y-5 fade-up">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-white font-black text-[20px] tracking-tight">
                  {bracketView === 'groups' ? 'Master Bracket — 12 Groups' : 'Knockout Bracket — Road to the Final'}
                </h2>
                <p className="text-white/45 text-[13px] mt-0.5">
                  {bracketView === 'groups'
                    ? 'Two taps per group seeds all 48 teams. No spreadsheets.'
                    : 'Seeded straight from your group picks. Tap to advance teams to the Final.'}
                </p>
              </div>
              <Segmented value={bracketView} onChange={setBracketView}
                options={[
                  { value: 'groups', label: 'Group Stage', icon: 'LayoutGrid' },
                  { value: 'knockout', label: 'Knockout', icon: 'GitFork' },
                ]} />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap rounded-2xl border border-white/8 px-4 py-2.5" style={{ background: 'rgba(255,255,255,.03)' }}>
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-white"><Icon name="Star" size={15} style={{ color: 'var(--pitch)' }} /> Bracket Score
                <InfoPopover align="left" label="How scoring works" text={
                  <span>Your points are <b className="text-white">projected</b> — locked in as you predict, then graded against real results once matches finish. Lock a group <b className="text-white">+10</b> · knockout ties by round (R32 5 → Final 75) · matchday outcome <b className="text-white">3</b>, exact score <b className="text-white">+2</b>. On the leaderboard you also carry your season-so-far total.</span>
                } />
              </span>
              <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--pitch)' }}>{bracketScore.total}</span>
              <span className="text-[11px] text-white/45">pts locked in</span>
              {lockedGroups < 12 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(56,189,248,.14)', color: 'var(--accent)' }}>
                  <Icon name="ArrowRight" size={12} />{12 - lockedGroups} group{12 - lockedGroups > 1 ? 's' : ''} left to lock
                </span>
              )}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-white/55 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-white/5 whitespace-nowrap">Groups <b className="text-white">{bracketScore.group}</b></span>
                <span className="px-2 py-1 rounded-lg bg-white/5 whitespace-nowrap">Knockout <b className="text-white">{bracketScore.knockout}</b></span>
                <span className="px-2 py-1 rounded-lg bg-white/5 whitespace-nowrap">Matchday <b className="text-white">{bracketScore.matchday}</b></span>
              </span>
            </div>

            {bracketView === 'groups' ? (
              <div className="space-y-5">
                <div className="flex items-center justify-end gap-3 text-[12px]">
                  <span className="flex items-center gap-1.5 text-white/50"><StatusDot status="untouched" /> Untouched</span>
                  <span className="flex items-center gap-1.5 text-white/50"><StatusDot status="progress" /> In progress</span>
                  <span className="flex items-center gap-1.5 text-white/50"><StatusDot status="locked" /> Locked</span>
                </div>
                <GroupGrid rankings={rankings} onOpenGroup={setOpenGroup} />
                <ThirdPlaceAutomator rankings={rankings} />
              </div>
            ) : (
              <KnockoutBracket rankings={rankings} koPicks={koPicks} onPick={setKoPick}
                onReset={() => setKoPicks({})} lockedGroups={lockedGroups} />
            )}
          </div>
        )}

        {tab === 'predict' && (
          <div key="predict" className="fade-up">
            <div className="mb-4">
              <h2 className="text-white font-black text-[20px] tracking-tight">Daily Match Predictor</h2>
              <p className="text-white/45 text-[13px] mt-0.5">One tap to back a winner. Add an exact score for bonus points — totally optional. Outcomes you’ve already set in your bracket are locked here. Kickoff times show in your local zone.</p>
            </div>
            <DailyPredictor state={predState} setState={setPredState} rankings={rankings} matches={live.matches} live={live} />
          </div>
        )}

        {tab === 'board' && (
          <div key="board" className="max-w-3xl mx-auto fade-up">
            <div className="mb-4">
              <h2 className="text-white font-black text-[20px] tracking-tight">The Camaraderie Hub</h2>
              <p className="text-white/45 text-[13px] mt-0.5">Climb the office ladder. Tap a name to peek at their pick — and send some banter.</p>
            </div>
            <Leaderboard liveScore={bracketScore.you} breakdown={bracketScore} players={identity.players} departments={identity.departments} />
          </div>
        )}
      </main>

      {openGroup && (
        <RankingPanel key={openGroup} letter={openGroup} codes={window.GROUPS[openGroup]}
          ranking={rankings[openGroup]} onChange={(arr) => setGroupRanking(openGroup, arr)}
          hasNext={window.GROUP_KEYS.some((g) => g !== openGroup && (rankings[g] || []).length < 4)}
          onNext={() => {
            const next = window.GROUP_KEYS.find((g) => g !== openGroup && (rankings[g] || []).length < 4);
            setOpenGroup(next || null);
          }}
          onClose={() => setOpenGroup(null)} />
      )}

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-[11px] text-white/25">
        Sensi World Cup 2026 · Office prediction league · Fixtures from the official FWC26 schedule
      </footer>

      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor label="Accent color" value={t.accent}
          options={['#38bdf8', '#8b5cf6', '#f59e0b', '#f43f5e']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Surface" />
        <TweakSlider label="Glass intensity" value={t.glass} min={0} max={100} unit="%"
          onChange={(v) => setTweak('glass', v)} />
        <TweakToggle label="Ambient stadium glow" value={t.glow}
          onChange={(v) => setTweak('glow', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
