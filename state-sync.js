/* ============================================================
   Sensi World Cup — server state sync (additive, fail-safe)
   ------------------------------------------------------------
   The prototype persists to localStorage under 'sensi-wc-2026'. This
   module makes that durable + cross-device by mirroring it to the
   backend (/api/state), WITHOUT touching the UI:

     • write-through — every localStorage write to the app key is
       debounced and PUT to the server (server enforces kickoff locks).
     • pull-on-load  — fetches the server copy; if it's newer, it
       updates localStorage so the next mount/refresh hydrates from it.

   If /api/state is missing or errors (e.g. running the static files
   with no backend), every step no-ops and the app falls back to plain
   localStorage. Nothing breaks.
   ============================================================ */
(function () {
  var KEY = 'sensi-wc-2026';
  var META = 'sensi-wc-2026:syncedAt';
  var base = (window.IdentityProvider && '') || '';
  var STATE_URL = '/api/state';

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function writeLocal(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }

  // ---- pull on load: hydrate localStorage from the server if newer ----
  function pull() {
    return fetch(STATE_URL, { headers: { Accept: 'application/json' }, credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (server) {
        if (!server) return;
        var hasServer = server.updatedAt && (
          Object.keys(server.rankings || {}).length ||
          Object.keys(server.koPicks || {}).length ||
          Object.keys((server.predState || {}).preds || {}).length
        );
        if (!hasServer) return;
        var localSyncedAt = +localStorage.getItem(META) || 0;
        if (server.updatedAt > localSyncedAt) {
          var local = readLocal();
          writeLocal({
            phase: local.phase, tab: local.tab, bracketView: local.bracketView,
            rankings: server.rankings, koPicks: server.koPicks, predState: server.predState,
          });
          try { localStorage.setItem(META, String(server.updatedAt)); } catch (e) {}
        }
      })
      .catch(function () { /* offline / no backend — ignore */ });
  }

  // ---- write-through: push localStorage changes to the server ----
  var timer = null;
  function pushSoon() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var s = readLocal();
      fetch(STATE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rankings: s.rankings, koPicks: s.koPicks, predState: s.predState }),
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (res) {
          if (res && res.updatedAt) { try { localStorage.setItem(META, String(res.updatedAt)); } catch (e) {} }
        })
        .catch(function () { /* ignore */ });
    }, 800);
  }

  // intercept writes to the app's localStorage key
  var _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _set(k, v);
    if (k === KEY) pushSoon();
  };

  window.SensiState = { pull: pull, flush: pushSoon };
  pull(); // kick off hydration immediately
})();
