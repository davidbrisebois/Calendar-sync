import { query } from "../../lib/db.js";
import { sendCode } from "../../lib/mailer.js";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  const { email } = req.body;

  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000;

  await query("INSERT INTO auth_codes VALUES (?, ?, ?)", [
    email,
    code,
    expires,
  ]);

  await sendCode(email, code);

  res.json({ ok: true });
}