import { and, eq } from "drizzle-orm";
import { db, schema } from "../lib/db.js";
import { sendJson } from "../lib/http.js";
import { verify } from "../lib/jwt.js";
import { getValidAccessToken } from "../lib/graph-auth.js";

async function deleteGraphEvent(accessToken, eventId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`Graph delete failed (${res.status}): ${txt}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) return sendJson(res, 401, { error: "Unauthorized" });

    const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

    const mappings = await db
      .select()
      .from(schema.eventsMapping)
      .where(eq(schema.eventsMapping.userId, user.id));

    const accessToken = await getValidAccessToken(user.id);
    if (accessToken) {
      for (const mapping of mappings) {
        await deleteGraphEvent(accessToken, mapping.graphEventId);
      }
    }

    await db.delete(schema.eventsMapping).where(eq(schema.eventsMapping.userId, user.id));
    await db.delete(schema.configs).where(eq(schema.configs.userId, user.id));
    await db.delete(schema.graphTokens).where(eq(schema.graphTokens.userId, user.id));

    if (dbUser?.email) {
      await db.delete(schema.authCodes).where(eq(schema.authCodes.email, dbUser.email));
    }

    await db.delete(schema.users).where(eq(schema.users.id, user.id));

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
