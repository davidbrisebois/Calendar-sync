import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../lib/db.js";
import { sign } from "../../lib/jwt.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) throw new Error("Email + code required");

    const [authCode] = await db
      .select()
      .from(schema.authCodes)
      .where(and(eq(schema.authCodes.email, email), eq(schema.authCodes.code, code)))
      .orderBy(desc(schema.authCodes.expiresAt))
      .limit(1);

    if (!authCode || authCode.expiresAt < Date.now()) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid or expired code" }));
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

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token: sign(user) }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
