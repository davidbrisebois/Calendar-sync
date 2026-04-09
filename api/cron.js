import { query } from "../lib/db.js";
import { syncUser } from "../lib/sync.js";

export default async function handler(req, res) {
  try {
    const configs = await query("SELECT * FROM configs");

    for (const cfg of configs.rows) {
      await syncUser(cfg);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}