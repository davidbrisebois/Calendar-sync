const Database = require('better-sqlite3');
const db = new Database('./data/db.sqlite');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS auth_codes (
  email TEXT,
  code TEXT,
  expiresAt INTEGER
);

CREATE TABLE IF NOT EXISTS configs (
  userId TEXT,
  icsUrl TEXT,
  targetCalendarId TEXT
);

CREATE TABLE IF NOT EXISTS events_mapping (
  userId TEXT,
  icsUid TEXT,
  graphEventId TEXT,
  lastModified TEXT
);
`);

module.exports = db;