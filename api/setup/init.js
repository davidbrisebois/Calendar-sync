import { getMissingTables, initializeDatabase, isDbConfigured } from "../../lib/db-setup.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    if (!isDbConfigured()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "Database not configured (DATABASE_URL or TURSO_DATABASE_URL)" })
      );
    }

    await initializeDatabase();
    const missingTables = await getMissingTables();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        initialized: missingTables.length === 0,
        missingTables,
      })
    );
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
