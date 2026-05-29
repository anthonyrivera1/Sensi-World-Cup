/* ============================================================
   Sensi World Cup — Identity / roster provider (data adapter)
   ------------------------------------------------------------
   ONE interface for "who is signed in" + "who's in the league":
     getCurrentUser() -> Promise<User>
     getRoster()      -> Promise<{ players: Player[], departments: string[] }>

   Today: MOCK adapter (uses the seed data in data.js).
   To go real: set MODE='okta'. Identity comes from Okta SSO (OIDC);
   the roster comes from Okta (SCIM push, or Okta Users/Groups API),
   joined with each user's GAME STATS from your own DB.

   IMPORTANT SEPARATION OF CONCERNS:
     • Okta provides IDENTITY only — id, name, email, department.
     • Scores / momentum / exacts / streak / champion pick are the
       APP's data (from predictions), keyed by user id, NOT from Okta.
     The roster you render = Okta identities  ⟕ joined with  game stats.

   SCHEMAS:
     User   = { id, name, email, dept, you:boolean }
     Player = User + { score, delta, champ, exact, streak }   // identity ⟕ stats
   ============================================================ */

const IDENTITY_MODE = 'okta';            // 'mock' | 'okta'  — backend returns a demo identity until OKTA_* env is set
const IDENTITY_ME_URL = '/api/me';       // backend: current OIDC session -> User
const IDENTITY_ROSTER_URL = '/api/roster'; // backend: Okta roster ⟕ game stats -> Player[]

async function getCurrentUser() {
  if (IDENTITY_MODE === 'okta') {
    const r = await fetch(IDENTITY_ME_URL, { headers: { Accept: 'application/json' }, credentials: 'include' });
    if (r.status === 401) {
      // Okta configured but no session → kick off SSO login.
      const body = await r.json().catch(() => ({}));
      window.location.href = body.loginUrl || '/auth/login';
      return await new Promise(() => {}); // navigation pending; never resolves
    }
    if (!r.ok) throw new Error('me ' + r.status);
    return await r.json(); // { id, name, email, dept, you:true }
  }
  const me = (window.PLAYERS || []).find((p) => p.you) || { name: 'You', dept: 'R&D' };
  return { id: me.id || 'me', name: me.name, email: 'you@sensi.ai', dept: me.dept, you: true };
}

async function getRoster() {
  if (IDENTITY_MODE === 'okta') {
    const r = await fetch(IDENTITY_ROSTER_URL, { headers: { Accept: 'application/json' }, credentials: 'include' });
    if (!r.ok) throw new Error('roster ' + r.status);
    const data = await r.json();           // { players, departments }
    return { players: data.players || [], departments: data.departments || [] };
  }
  await new Promise((res) => setTimeout(res, 200));
  return { players: window.PLAYERS || [], departments: window.DEPARTMENTS || [] };
}

window.IdentityProvider = {
  MODE: IDENTITY_MODE, ME_URL: IDENTITY_ME_URL, ROSTER_URL: IDENTITY_ROSTER_URL,
  getCurrentUser, getRoster,
};
