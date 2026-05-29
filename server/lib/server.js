/* ============================================================
   Sensi World Cup — tiny zero-dependency HTTP framework
   ------------------------------------------------------------
   A minimal Express-shaped router built on node:http so the whole
   backend runs with NO third-party dependencies (nothing to install,
   nothing to compile, trivial to publish & boot). Provides just what
   this app needs: method routing, JSON body parsing, signed-cookie
   sessions, static file serving, and Express-style res helpers.
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json',
};

/* ---------- signed cookie sessions ---------- */
function sign(value, secret) {
  const mac = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${mac}`;
}
function unsign(signed, secret) {
  if (!signed) return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i), mac = signed.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret).update(value).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}
function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function createApp({ sessionSecret, sessionSecure = false, cookieName = 'sensi.sid', bodyLimit = 262144 } = {}) {
  const routes = []; // { method, path, handler }
  let staticDir = null, staticIndex = null;

  const app = {
    get: (p, h) => routes.push({ method: 'GET', path: p, handler: h }),
    put: (p, h) => routes.push({ method: 'PUT', path: p, handler: h }),
    post: (p, h) => routes.push({ method: 'POST', path: p, handler: h }),
    static: (dir, index) => { staticDir = dir; staticIndex = index; },
  };

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > bodyLimit) { reject(Object.assign(new Error('payload too large'), { status: 413 })); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return resolve(undefined);
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
        } else resolve(raw);
      });
      req.on('error', reject);
    });
  }

  function makeRes(req, res, sessionState) {
    const helper = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      set(k, v) { this.headers[k] = v; return this; },
      _flushSession() {
        const next = JSON.stringify(sessionState.data);
        if (next === sessionState.original && !sessionState.destroyed) return;
        if (sessionState.destroyed) {
          res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${sessionSecure ? '; Secure' : ''}`);
          return;
        }
        const value = Buffer.from(next).toString('base64url');
        const cookie = `${cookieName}=${sign(value, sessionSecret)}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${sessionSecure ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', cookie);
      },
      json(obj) {
        this._flushSession();
        const body = JSON.stringify(obj);
        res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(body);
      },
      redirect(url) {
        this._flushSession();
        res.writeHead(302, { ...this.headers, Location: url });
        res.end();
      },
      send(text) {
        this._flushSession();
        res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': this.headers['Content-Type'] || 'text/plain; charset=utf-8' });
        res.end(text);
      },
      sendFile(filePath) {
        fs.readFile(filePath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not found'); return; }
          this._flushSession();
          res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
          res.end(data);
        });
      },
    };
    return helper;
  }

  function serveStatic(pathname, res) {
    if (!staticDir) return false;
    // prevent path traversal
    const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(staticDir, safe);
    if (!filePath.startsWith(staticDir)) { res.status(403).send('Forbidden'); return true; }
    try {
      const st = fs.statSync(filePath);
      if (st.isFile()) { res.sendFile(filePath); return true; }
    } catch { /* not a static file */ }
    return false;
  }

  const server = http.createServer(async (req, rawRes) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    // session from signed cookie
    const cookies = parseCookies(req.headers.cookie);
    let data = {};
    const decoded = unsign(cookies[cookieName], sessionSecret);
    if (decoded) { try { data = JSON.parse(Buffer.from(decoded, 'base64url').toString('utf8')) || {}; } catch { data = {}; } }
    const sessionState = { data, original: JSON.stringify(data), destroyed: false };

    const res = makeRes(req, rawRes, sessionState);
    req.path = pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.session = data;
    req.session.destroy = (cb) => { sessionState.destroyed = true; if (cb) cb(); };
    // keep destroy() non-enumerable so it doesn't get serialized
    Object.defineProperty(req.session, 'destroy', { enumerable: false, value: req.session.destroy });

    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') req.body = await readBody(req);

      const route = routes.find((r) => r.method === req.method && r.path === pathname);
      if (route) { await route.handler(req, res); return; }

      // static assets (GET only)
      if (req.method === 'GET' && serveStatic(pathname, res)) return;

      // API/auth 404s as JSON; everything else falls back to the app shell (SPA)
      if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
        res.status(404).json({ error: 'not_found' });
      } else if (staticDir && staticIndex && req.method === 'GET') {
        res.status(200).sendFile(path.join(staticDir, staticIndex));
      } else {
        res.status(404).send('Not found');
      }
    } catch (err) {
      console.error('[server]', err);
      if (!rawRes.headersSent) res.status(err.status || 500).json({ error: 'server_error', message: err.message });
    }
  });

  return { app, server, listen: (port, cb) => server.listen(port, cb) };
}
