import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { getMissingTables, initializeDatabase, isDbConfigured } from "../lib/db-setup.js";
import { sendJson } from "../lib/http.js";

async function getStatus() {
  const configured = isDbConfigured();

  if (!configured) {
    return {
      configured: false,
      reachable: false,
      initialized: false,
      missingTables: [],
    };
  }

  await db.run(sql`SELECT 1`);
  const missingTables = await getMissingTables();

  return {
    configured: true,
    reachable: true,
    initialized: missingTables.length === 0,
    missingTables,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const status = await getStatus();
      return sendJson(res, 200, status);
    }

    if (req.method === "POST") {
      if (!isDbConfigured()) {
        return sendJson(res, 400, {
          error: "Database not configured (DATABASE_URL or TURSO_DATABASE_URL)",
        });
      }

      await initializeDatabase();
      const status = await getStatus();
      return sendJson(res, 200, {
        ok: true,
        initialized: status.initialized,
        missingTables: status.missingTables,
      });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, {
      configured: isDbConfigured(),
      reachable: false,
      initialized: false,
      missingTables: [],
      error: err.message,
    });
  }
}
