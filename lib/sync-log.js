import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./db.js";

const MAX_STORED_LOGS_PER_USER = 50;

export async function addSyncLog({ userId, status, trigger, details = "" }) {
  await db.insert(schema.syncLogs).values({
    userId,
    status,
    trigger,
    details,
    syncedAt: Date.now(),
  });

  const rows = await db
    .select({ id: schema.syncLogs.id })
    .from(schema.syncLogs)
    .where(eq(schema.syncLogs.userId, userId))
    .orderBy(desc(schema.syncLogs.syncedAt), desc(schema.syncLogs.id));

  const staleIds = rows.slice(MAX_STORED_LOGS_PER_USER).map((row) => row.id);
  if (!staleIds.length) return;

  for (const id of staleIds) {
    await db.delete(schema.syncLogs).where(and(eq(schema.syncLogs.userId, userId), eq(schema.syncLogs.id, id)));
  }
}

export async function getRecentSyncLogs(userId, limit = 20) {
  return db
    .select({
      syncedAt: schema.syncLogs.syncedAt,
      status: schema.syncLogs.status,
      trigger: schema.syncLogs.trigger,
      details: schema.syncLogs.details,
    })
    .from(schema.syncLogs)
    .where(eq(schema.syncLogs.userId, userId))
    .orderBy(desc(schema.syncLogs.syncedAt), desc(schema.syncLogs.id))
    .limit(limit);
}
