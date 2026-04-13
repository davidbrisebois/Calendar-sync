import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db.js";
import { verify } from "../lib/jwt.js";
import { getRecentSyncLogs } from "../lib/sync-log.js";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    if (req.method === "GET") {
      const [config] = await db
        .select()
        .from(schema.configs)
        .where(eq(schema.configs.userId, user.id))
        .limit(1);
      const syncLogs = await getRecentSyncLogs(user.id);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        ...(config || {}),
        syncLogs,
      }));
    }

    if (req.method === "POST") {
      const { icsUrl, targetCalendarId, titlePrefix = "" } = req.body;

      await db.delete(schema.configs).where(eq(schema.configs.userId, user.id));
      await db.insert(schema.configs).values({
        userId: user.id,
        icsUrl,
        targetCalendarId,
        titlePrefix,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
