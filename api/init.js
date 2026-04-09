import db from "../lib/db.js";

export default async function handler(req, res) {
  try {
    // Créer les tables si elles n'existent pas
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS auth_codes (
        email TEXT,
        code TEXT,
        expiresAt INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS configs (
        userId TEXT,
        icsUrl TEXT,
        targetCalendarId TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS events_mapping (
        userId TEXT,
        icsUid TEXT,
        graphEventId TEXT,
        lastModified TEXT
      )`,
    ];

    for (const sql of tables) {
      try {
        await db.execute({ sql });
      } catch (err) {
        console.warn("Warning: table creation skipped or already exists:", err.message);
        // on continue même si Turso renvoie une erreur de migration
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, msg: "DB initialized (or tables exist)" }));
  } catch (err) {
    console.error("DB init failed:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}