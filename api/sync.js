import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db.js";
import { verify } from "../lib/jwt.js";
import { syncUser } from "../lib/sync.js";
import { addSyncLog } from "../lib/sync-log.js";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Unauthorized" }));
    }

    const [config] = await db
      .select()
      .from(schema.configs)
      .where(eq(schema.configs.userId, user.id))
      .limit(1);

    if (!config) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "No config found" }));
    }

    const stats = await syncUser(config);
    await addSyncLog({
      userId: user.id,
      status: "success",
      trigger: "manual",
      details: `processed=${stats.processed || 0};total=${stats.total || 0}`,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, stats }));
  } catch (err) {
    const token = req.headers.authorization;
    const user = verify(token);
    if (user?.id) {
      await addSyncLog({
        userId: user.id,
        status: "failed",
        trigger: "manual",
        details: err.message,
      });
    }
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
