import { createClient } from "@libsql/client/web";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function query(sql, args = []) {
  try {
    return await db.execute({ sql, args });
  } catch (err) {
    console.error("Turso query error:", err);
    throw err;
  }
}