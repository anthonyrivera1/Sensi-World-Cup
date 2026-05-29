/* ============================================================
   Sensi World Cup — SQLite connection + schema (node:sqlite)
   ------------------------------------------------------------
   Uses Node's built-in SQLite (node:sqlite) — a real SQL database
   with ZERO third-party dependencies and no native compile step.
   Replaces the prototype's per-browser localStorage with a shared,
   per-user, server-side store.
   ============================================================ */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

let dbFile = config.db.file;
if (dbFile !== ':memory:') {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
}

export const db = new DatabaseSync(dbFile);
// WAL is a performance optimization; some filesystems (network/overlay
// mounts) don't support its shared-memory file. Try it, fall back quietly.
try { db.exec('PRAGMA journal_mode = WAL'); } catch { /* default journal */ }
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,           -- Okta sub, or demo id
    name        TEXT NOT NULL,
    email       TEXT,
    dept        TEXT,
    created_at  INTEGER NOT NULL,
    last_login  INTEGER
  );

  CREATE TABLE IF NOT EXISTS game_state (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rankings    TEXT NOT NULL DEFAULT '{}',
    ko_picks    TEXT NOT NULL DEFAULT '{}',
    pred_state  TEXT NOT NULL DEFAULT '{}',
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_results (
    match_id    TEXT PRIMARY KEY,
    grp         TEXT,
    home        TEXT,
    away        TEXT,
    status      TEXT,
    home_goals  INTEGER,
    away_goals  INTEGER,
    kickoff_at  INTEGER,
    updated_at  INTEGER NOT NULL
  );
`);

// run fn() inside a transaction (node:sqlite has no .transaction helper)
export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
