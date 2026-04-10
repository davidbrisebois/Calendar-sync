import { db, schema } from "../lib/db.js";
import { syncUser } from "../lib/sync.js";

export default async function handler(req, res) {
  try {
    const allConfigs = await db.select().from(schema.configs);

    for (const config of allConfigs) {
      await syncUser(config);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
