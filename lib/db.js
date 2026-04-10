import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

function missingDbProxy() {
  const err = () => {
    throw new Error("Missing TURSO_DATABASE_URL or DATABASE_URL");
  };

  return {
    run: err,
    all: err,
    select: err,
    insert: err,
    delete: err,
    update: err,
  };
}

function resolveSqlitePath(rawUrl) {
  if (!rawUrl || rawUrl === ":memory:") return rawUrl;
  if (rawUrl.startsWith("file:")) {
    return new URL(rawUrl).pathname;
  }
  return path.resolve(rawUrl);
}

function ensureSqliteDirectory(dbPath) {
  if (!dbPath || dbPath === ":memory:") return;
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
}

function createDb() {
  if (process.env.DATABASE_URL) {
    const sqlitePath = resolveSqlitePath(process.env.DATABASE_URL);
    ensureSqliteDirectory(sqlitePath);
    const sqlite = new Database(sqlitePath);
    return drizzleSqlite(sqlite, { schema });
  }

  if (!process.env.TURSO_DATABASE_URL) {
    return missingDbProxy();
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return drizzleLibsql(client, { schema });
}

export const db = createDb();
export { schema };
