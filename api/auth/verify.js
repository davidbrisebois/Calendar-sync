import { query } from "../../lib/db.js";
import { sign } from "../../lib/jwt.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) throw new Error("Email + code required");

    const result = await query(
      "SELECT * FROM auth_codes WHERE email=? AND code=?",
      [email, code]
    );

    const row = result.rows[0];
    if (!row || row.expiresAt < Date.now()) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid or expired code" }));
    }

    let userRes = await query("SELECT * FROM users WHERE email=?", [email]);
    let user = userRes.rows[0];

    if (!user) {
      const id = uuidv4();
      await query("INSERT INTO users VALUES (?, ?)", [id, email]);
      user = { id, email };
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token: sign(user) }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}