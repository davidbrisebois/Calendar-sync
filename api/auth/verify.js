import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../lib/db.js";
import { sendJson, readJsonBody } from "../../lib/http.js";
import { sign } from "../../lib/jwt.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { email, code } = await readJsonBody(req);
    if (!email || !code) throw new Error("Email + code required");

    const [authCode] = await db
      .select()
      .from(schema.authCodes)
      .where(and(eq(schema.authCodes.email, email), eq(schema.authCodes.code, code)))
      .orderBy(desc(schema.authCodes.expiresAt))
      .limit(1);

    if (!authCode || authCode.expiresAt < Date.now()) {
      return sendJson(res, 401, { error: "Invalid or expired code" });
    }

    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      user = { id: uuidv4(), email };
      await db.insert(schema.users).values(user);
    }

    return sendJson(res, 200, { token: sign(user) });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
