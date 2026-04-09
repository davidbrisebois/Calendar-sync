import { query } from "../lib/db.js";
import { verify } from "../lib/jwt.js";

export default async function handler(req, res) {
  const token = req.headers.authorization;
  const user = verify(token);
  if (!user) return res.status(401).end();

  if (req.method === "GET") {
    const result = await query(
      "SELECT * FROM configs WHERE userId=?",
      [user.id]
    );
    return res.json(result.rows[0] || {});
  }

  if (req.method === "POST") {
    const { icsUrl, targetCalendarId } = req.body;

    await query("DELETE FROM configs WHERE userId=?", [user.id]);

    await query("INSERT INTO configs VALUES (?, ?, ?)", [
      user.id,
      icsUrl,
      targetCalendarId,
    ]);

    return res.json({ ok: true });
  }
}