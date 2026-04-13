import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db.js";

const MAX_STORED_LOGS_PER_USER = 50;
let syncLogStorageReady = false;

async function ensureSyncLogStorage() {
  if (syncLogStorageReady) return;

  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      syncedAt INTEGER NOT NULL,
      status TEXT NOT NULL,
      trigger TEXT NOT NULL,
      details TEXT
    )`));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_sync_logs_user_synced_at ON sync_logs(userId, syncedAt DESC)"));

  syncLogStorageReady = true;
}

export async function addSyncLog({ userId, status, trigger, details = "" }) {
  await ensureSyncLogStorage();

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
  try {
    await ensureSyncLogStorage();
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
  } catch {
    return [];
  }
}

export async function getRecentSyncLogsByIdentity({ userId, email }, limit = 20) {
  await ensureSyncLogStorage();

  const candidateIds = new Set([userId]);
  if (email) {
    const linkedUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${email})`);

    for (const row of linkedUsers) {
      if (row?.id) candidateIds.add(row.id);
    }
  }

  return db
    .select({
      syncedAt: schema.syncLogs.syncedAt,
      status: schema.syncLogs.status,
      trigger: schema.syncLogs.trigger,
      details: schema.syncLogs.details,
    })
    .from(schema.syncLogs)
    .where(inArray(schema.syncLogs.userId, Array.from(candidateIds)))
    .orderBy(desc(schema.syncLogs.syncedAt), desc(schema.syncLogs.id))
    .limit(limit);
}
