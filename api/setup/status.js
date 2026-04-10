import { sql } from "drizzle-orm";
import { db } from "../../lib/db.js";
import { getMissingTables, isDbConfigured } from "../../lib/db-setup.js";

export default async function handler(req, res) {
  try {
    const configured = isDbConfigured();

    if (!configured) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          configured: false,
          reachable: false,
          initialized: false,
          missingTables: [],
        })
      );
    }

    await db.run(sql`SELECT 1`);
    const missingTables = await getMissingTables();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        configured: true,
        reachable: true,
        initialized: missingTables.length === 0,
        missingTables,
      })
    );
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        configured: isDbConfigured(),
        reachable: false,
        initialized: false,
        missingTables: [],
        error: err.message,
      })
    );
  }
}
