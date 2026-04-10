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

function createDb() {
  if (process.env.DATABASE_URL) {
    const sqlite = new Database(process.env.DATABASE_URL);
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
