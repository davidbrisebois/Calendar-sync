import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
});

export const authCodes = sqliteTable("auth_codes", {
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expiresAt", { mode: "number" }).notNull(),
});

export const configs = sqliteTable("configs", {
  userId: text("userId").notNull(),
  icsUrl: text("icsUrl"),
  targetCalendarId: text("targetCalendarId"),
  titlePrefix: text("titlePrefix").default(""),
});

export const eventsMapping = sqliteTable("events_mapping", {
  userId: text("userId").notNull(),
  icsUid: text("icsUid").notNull(),
  graphEventId: text("graphEventId").notNull(),
  lastModified: text("lastModified"),
});


export const graphTokens = sqliteTable("graph_tokens", {
  userId: text("userId").primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: integer("expiresAt", { mode: "number" }).notNull(),
  scope: text("scope"),
  tokenType: text("tokenType"),
});
