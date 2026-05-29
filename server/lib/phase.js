/* ============================================================
   Sensi World Cup — phase lifecycle (server-derived)
   ------------------------------------------------------------
   The prototype's A/B toggle is a manual demo switch. In production
   the phase is DERIVED from tournament state:
     • Phase A (Pre-Tournament): bracket is editable.
     • Phase B (Matchday): kicked off — group editing locks, the
       "Pre-Tournament" tab becomes a read-only "Bracket" view.
   Trigger: any match live/finished in the feed, OR wall clock passes
   config.tournamentStart.
   ============================================================ */
import { config, features } from '../config.js';
import { allResults } from '../db/repo.js';

export function tournamentStarted() {
  // 1) feed signal — any match live or finished. Only the REAL provider
  // drives the lifecycle; the demo feed is illustrative and keeps the
  // bracket previewable (Phase A) until TOURNAMENT_START is configured.
  if (features.liveScores) {
    for (const r of allResults()) {
      if (r.status === 'live' || r.status === 'finished') return { started: true, reason: 'feed' };
    }
  }
  // 2) configured start time
  if (config.tournamentStart) {
    const t = Date.parse(config.tournamentStart);
    if (!Number.isNaN(t) && Date.now() >= t) return { started: true, reason: 'schedule' };
  }
  return { started: false, reason: 'pre-tournament' };
}

export function phaseState() {
  const { started, reason } = tournamentStarted();
  return {
    phase: started ? 'B' : 'A',
    started,
    reason,
    bracketEditable: !started, // group ranking + bracket editing closes at start
    tabLabel: started ? 'Bracket' : 'Pre-Tournament',
  };
}
