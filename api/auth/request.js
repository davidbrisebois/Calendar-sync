import { query } from "../../lib/db.js";
import { sendCode } from "../../lib/mailer.js";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  try {
    const { email } = req.body;
    if (!email) throw new Error("Email required");

    const code = generateCode();
    const expires = Date.now() + 5 * 60 * 1000;

    await query("INSERT INTO auth_codes VALUES (?, ?, ?)", [
      email,
      code,
      expires,
    ]);

    await sendCode(email, code);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}