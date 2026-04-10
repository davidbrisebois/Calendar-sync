CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS auth_codes (
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expiresAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS configs (
  userId TEXT NOT NULL,
  icsUrl TEXT,
  targetCalendarId TEXT,
  titlePrefix TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events_mapping (
  userId TEXT NOT NULL,
  icsUid TEXT NOT NULL,
  graphEventId TEXT NOT NULL,
  lastModified TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_email_code ON auth_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(userId);
CREATE INDEX IF NOT EXISTS idx_events_mapping_user_uid ON events_mapping(userId, icsUid);


CREATE TABLE IF NOT EXISTS graph_tokens (
  userId TEXT PRIMARY KEY,
  accessToken TEXT NOT NULL,
  refreshToken TEXT,
  expiresAt INTEGER NOT NULL,
  scope TEXT,
  tokenType TEXT
);

CREATE INDEX IF NOT EXISTS idx_graph_tokens_expires_at ON graph_tokens(expiresAt);
