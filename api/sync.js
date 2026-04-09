import { query } from "../lib/db.js";
import { verify } from "../lib/jwt.js";
import { syncUser } from "../lib/sync.js";

export default async function handler(req, res) {
  const token = req.headers.authorization;
  const user = verify(token);
  if (!user) return res.status(401).end();

  const result = await query(
    "SELECT * FROM configs WHERE userId=?",
    [user.id]
  );

  await syncUser(result.rows[0]);

  res.json({ ok: true });
}