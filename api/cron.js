import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db.js";
import { syncUser } from "../lib/sync.js";
import { sendGraphConnectionLostEmail } from "../lib/mailer.js";
import { sendJson } from "../lib/http.js";
import { addSyncLog } from "../lib/sync-log.js";

function isCronAuthorized(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;

  const provided =
    req.headers["x-cron-secret"] ||
    req.headers["X-CRON-SECRET"] ||
    req.query?.secret;

  return provided === expected;
}

function graphConnectionLost(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("graph token missing") || msg.includes("invalid_grant") || msg.includes("expired");
}

export default async function handler(req, res) {
  try {
    if (!isCronAuthorized(req)) {
      return sendJson(res, 401, { error: "Unauthorized cron" });
    }

    const allConfigs = await db.select().from(schema.configs);
    const stats = { total: allConfigs.length, success: 0, failed: 0, alerts: 0 };

    for (const config of allConfigs) {
      try {
        const result = await syncUser(config);
        stats.success += 1;
        await addSyncLog({
          userId: config.userId,
          status: "success",
          trigger: "cron",
          details: `processed=${result.processed || 0};total=${result.total || 0}`,
        });
      } catch (err) {
        stats.failed += 1;
        await addSyncLog({
          userId: config.userId,
          status: "failed",
          trigger: "cron",
          details: err.message,
        });

        if (graphConnectionLost(err)) {
          const [user] = await db.select().from(schema.users).where(eq(schema.users.id, config.userId)).limit(1);
          if (user?.email) {
            await sendGraphConnectionLostEmail(user.email);
            stats.alerts += 1;
          }
        }
      }
    }

    return sendJson(res, 200, { ok: true, stats });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
}
