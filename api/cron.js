import { query } from "../lib/db.js";
import { syncUser } from "../lib/sync.js";

export default async function handler(req, res) {
  const configs = await query("SELECT * FROM configs");

  for (const cfg of configs.rows) {
    await syncUser(cfg);
  }

  res.json({ ok: true });
}