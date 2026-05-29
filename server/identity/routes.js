/* ============================================================
   Sensi World Cup — identity & auth routes
   ------------------------------------------------------------
   Endpoints the frontend identity-provider.js (okta mode) reads:
     GET /api/me      -> signed-in User { id, name, email, dept, you:true }
     GET /api/roster  -> { players, departments }  (Okta identities ⟕ stats)
   Plus the OIDC SSO flow (/auth/login, /auth/callback, /auth/logout).

   When Okta is NOT configured the routes degrade to a stable demo
   identity + the prototype roster, so the app is fully usable offline.
   ============================================================ */
import { config, features } from '../config.js';
import { getClient, buildAuthUrl, newVerifier, newState, userFromClaims } from './okta.js';
import { upsertUser } from '../db/repo.js';
import { buildRoster } from './roster.js';
import { DEMO_PLAYERS, DEPARTMENTS } from '../data.js';

const DEMO_USER = { id: 'demo-you', name: 'You', email: 'you@sensi.ai', dept: 'R&D' };

export function registerIdentityRoutes(app) {
  /* ---------------- GET /api/me ---------------- */
  app.get('/api/me', (req, res) => {
    if (!features.okta) {
      upsertUser(DEMO_USER);
      return res.json({ ...DEMO_USER, you: true });
    }
    const u = req.session?.user;
    if (!u) return res.status(401).json({ error: 'not_authenticated', loginUrl: '/auth/login' });
    res.json({ ...u, you: true });
  });

  /* ---------------- GET /api/roster ---------------- */
  app.get('/api/roster', (req, res) => {
    if (!features.okta) {
      return res.json({ players: DEMO_PLAYERS, departments: DEPARTMENTS });
    }
    res.json(buildRoster(req.session?.user?.id));
  });

  /* ---------------- OIDC SSO flow ---------------- */
  app.get('/auth/login', async (req, res) => {
    if (!features.okta) return res.redirect('/');
    const client = await getClient();
    const state = await newState();
    const codeVerifier = await newVerifier();
    req.session.oidc = { state, codeVerifier };
    res.redirect(await buildAuthUrl(client, { state, codeVerifier }));
  });

  app.get('/auth/callback', async (req, res) => {
    if (!features.okta) return res.redirect('/');
    const client = await getClient();
    const { state, codeVerifier } = req.session.oidc || {};
    const params = client.callbackParams(req); // req is the node IncomingMessage
    const tokenSet = await client.callback(config.okta.redirectUri, params, { state, code_verifier: codeVerifier });
    const user = userFromClaims(tokenSet.claims());
    user.dept = normalizeDept(user.dept);
    upsertUser(user); // lazy provisioning
    delete req.session.oidc;
    req.session.user = user;
    req.session.idToken = tokenSet.id_token;
    res.redirect('/');
  });

  app.get('/auth/logout', async (req, res) => {
    const idToken = req.session?.idToken;
    req.session.destroy();
    if (features.okta && idToken) {
      const client = await getClient();
      return res.redirect(client.endSessionUrl({
        post_logout_redirect_uri: config.okta.postLogoutRedirectUri,
        id_token_hint: idToken,
      }));
    }
    res.redirect('/');
  });
}
