import { query } from "../../lib/db.js";
import { sign } from "../../lib/jwt.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  const { email, code } = req.body;

  const result = await query(
    "SELECT * FROM auth_codes WHERE email=? AND code=?",
    [email, code]
  );

  const row = result.rows[0];
  if (!row || row.expiresAt < Date.now()) {
    return res.status(401).end();
  }

  let userRes = await query("SELECT * FROM users WHERE email=?", [email]);
  let user = userRes.rows[0];

  if (!user) {
    const id = uuidv4();
    await query("INSERT INTO users VALUES (?, ?)", [id, email]);
    user = { id, email };
  }

  res.json({ token: sign(user) });
}