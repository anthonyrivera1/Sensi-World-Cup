/* ============================================================
   Sensi World Cup — server entry (zero runtime dependencies)
   ------------------------------------------------------------
   Serves the existing static prototype AND the API the two frontend
   adapters read (scores + identity). Same origin → no CORS, cookies
   "just work". Built entirely on Node built-ins (http + node:sqlite +
   crypto): nothing to install or compile to run the core app.
   ============================================================ */
import path from 'node:path';
import { config, describeMode } from './config.js';
import { createApp } from './lib/server.js';
import './db/db.js'; // initialise schema on boot
import { registerApiRoutes } from './routes/api.js';
import { registerIdentityRoutes } from './identity/routes.js';

export function buildApp() {
  const { app, server, listen } = createApp({
    sessionSecret: config.session.secret,
    sessionSecure: config.session.secure,
  });

  registerIdentityRoutes(app);
  registerApiRoutes(app);

  // static prototype lives one level up from /server
  app.static(config.staticDir, config.htmlEntry);
  app.get('/', (req, res) => res.sendFile(path.join(config.staticDir, config.htmlEntry)));

  return { app, server, listen };
}

// start only when run directly (not when imported by tests)
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { listen } = buildApp();
  listen(config.port, () => {
    const m = describeMode();
    console.log(`\n  Sensi World Cup server  →  http://localhost:${config.port}`);
    console.log(`    scores:   ${m.scores}`);
    console.log(`    identity: ${m.identity}\n`);
  });
}
