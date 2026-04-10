import { db, schema } from "../../lib/db.js";
import { sendJson, readJsonBody } from "../../lib/http.js";
import { sendCode } from "../../lib/mailer.js";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { email } = await readJsonBody(req);
    if (!email) throw new Error("Email required");

    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.insert(schema.authCodes).values({
      email,
      code,
      expiresAt,
    });

    await sendCode(email, code);

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
