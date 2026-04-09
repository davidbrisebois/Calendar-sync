import { query } from "../lib/db.js";
import { verify } from "../lib/jwt.js";
import { syncUser } from "../lib/sync.js";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    const result = await query("SELECT * FROM configs WHERE userId=?", [
      user.id,
    ]);

    if (!result.rows[0]) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "No config found" }));
    }

    await syncUser(result.rows[0]);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}