import { query } from "../lib/db.js";
import { verify } from "../lib/jwt.js";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    if (req.method === "GET") {
      const result = await query("SELECT * FROM configs WHERE userId=?", [
        user.id,
      ]);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(result.rows[0] || {}));
    }

    if (req.method === "POST") {
      const { icsUrl, targetCalendarId } = req.body;
      await query("DELETE FROM configs WHERE userId=?", [user.id]);
      await query("INSERT INTO configs VALUES (?, ?, ?)", [
        user.id,
        icsUrl,
        targetCalendarId,
      ]);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}