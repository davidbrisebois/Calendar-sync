import { db } from "../lib/db.js";

export default async function handler(req, res) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      email TEXT,
      code TEXT,
      expiresAt INTEGER
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS configs (
      userId TEXT,
      icsUrl TEXT,
      targetCalendarId TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS events_mapping (
      userId TEXT,
      icsUid TEXT,
      graphEventId TEXT,
      lastModified TEXT
    )
  `);

  res.json({ ok: true });
}