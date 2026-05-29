/* ============================================================
   Sensi World Cup — Okta OIDC client (Authorization Code + PKCE)
   ------------------------------------------------------------
   OPTIONAL integration. `openid-client` is loaded lazily and only
   when Okta env is configured, so the core app has ZERO runtime
   dependencies. To enable real SSO:  npm install openid-client
   then set OKTA_ISSUER / OKTA_CLIENT_ID / OKTA_CLIENT_SECRET.

   Okta provides IDENTITY only (sub, name, email, department).
   Game stats are the app's own data, joined in /api/roster.
   ============================================================ */
import { config, features } from '../config.js';

let _lib = null;       // cached openid-client module
let _clientPromise = null;

async function lib() {
  if (_lib) return _lib;
  try {
    _lib = await import('openid-client');
    return _lib;
  } catch {
    throw new Error('Okta is enabled but `openid-client` is not installed. Run: npm install openid-client');
  }
}

export async function getClient() {
  if (!features.okta) throw new Error('Okta is not configured');
  if (!_clientPromise) {
    _clientPromise = (async () => {
      const { Issuer } = await lib();
      const issuer = await Issuer.discover(config.okta.issuer);
      return new issuer.Client({
        client_id: config.okta.clientId,
        client_secret: config.okta.clientSecret,
        redirect_uris: [config.okta.redirectUri],
        response_types: ['code'],
      });
    })();
  }
  return _clientPromise;
}

export async function buildAuthUrl(client, { state, codeVerifier }) {
  const { generators } = await lib();
  const code_challenge = generators.codeChallenge(codeVerifier);
  return client.authorizationUrl({
    scope: 'openid profile email',
    state,
    code_challenge,
    code_challenge_method: 'S256',
  });
}

export async function newVerifier() { const { generators } = await lib(); return generators.codeVerifier(); }
export async function newState() { const { generators } = await lib(); return generators.state(); }

export function userFromClaims(claims) {
  const dept =
    claims[config.okta.deptClaim] ||
    claims.department ||
    (Array.isArray(claims.groups) ? claims.groups[0] : undefined);
  return {
    id: claims.sub,
    name: claims.name || claims.preferred_username || claims.email || 'Player',
    email: claims.email || '',
    dept: dept || '',
  };
}
