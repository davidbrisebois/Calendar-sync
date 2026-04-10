import { sql } from "drizzle-orm";
import { db } from "./db.js";

export const REQUIRED_TABLES = [
  "users",
  "auth_codes",
  "configs",
  "events_mapping",
  "graph_tokens",
];

const SETUP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS auth_codes (
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS configs (
    userId TEXT NOT NULL,
    icsUrl TEXT,
    targetCalendarId TEXT,
    titlePrefix TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS events_mapping (
    userId TEXT NOT NULL,
    icsUid TEXT NOT NULL,
    graphEventId TEXT NOT NULL,
    lastModified TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_codes_email_code ON auth_codes(email, code)`,
  `CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_events_mapping_user_uid ON events_mapping(userId, icsUid)`,
  `CREATE TABLE IF NOT EXISTS graph_tokens (
    userId TEXT PRIMARY KEY,
    accessToken TEXT NOT NULL,
    refreshToken TEXT,
    expiresAt INTEGER NOT NULL,
    scope TEXT,
    tokenType TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_graph_tokens_expires_at ON graph_tokens(expiresAt)`,
];

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL);
}

export async function getMissingTables() {
  const rows = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`);
  const existing = new Set(rows.map((row) => row.name));
  return REQUIRED_TABLES.filter((table) => !existing.has(table));
}

export async function initializeDatabase() {
  for (const statement of SETUP_STATEMENTS) {
    await db.run(sql.raw(statement));
  }
}
