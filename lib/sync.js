import axios from "axios";
import { and, eq } from "drizzle-orm";
import ical from "node-ical";
import { db, schema } from "./db.js";
import { getValidAccessToken } from "./graph-auth.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function normalizeSummary(config, summary) {
  return `${config.titlePrefix || ""}${config.titlePrefix ? " " : ""}${summary || ""}`.trim();
}

function toGraphDateTime(date) {
  return new Date(date).toISOString();
}

function toSignature(event) {
  const marker = event.lastmodified || event.dtstamp || event.created || "";
  return [
    event.uid || "",
    event.summary || "",
    event.start ? new Date(event.start).toISOString() : "",
    event.end ? new Date(event.end).toISOString() : "",
    marker ? new Date(marker).toISOString() : "",
  ].join("|");
}

function toGraphPayload(config, event) {
  const timeZone = event.start?.tz || event.end?.tz || "UTC";

  return {
    subject: normalizeSummary(config, event.summary),
    start: {
      dateTime: toGraphDateTime(event.start),
      timeZone,
    },
    end: {
      dateTime: toGraphDateTime(event.end || event.start),
      timeZone,
    },
    isAllDay: Boolean(event.datetype === "date"),
    body: {
      contentType: "HTML",
      content: event.description || "",
    },
    location: {
      displayName: event.location || "",
    },
  };
}

async function graphRequest(accessToken, method, path, data, params) {
  return axios({
    method,
    url: `${GRAPH_BASE}${path}`,
    data,
    params,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

async function findExistingGraphEvent(accessToken, config, payload) {
  const res = await graphRequest(
    accessToken,
    "GET",
    `/me/calendars/${encodeURIComponent(config.targetCalendarId)}/events`,
    undefined,
    {
      $top: 100,
      $select: "id,subject,start,end",
    }
  );

  return (res.data.value || []).find((evt) => {
    const sameSubject = evt.subject === payload.subject;
    const sameStart = evt.start?.dateTime === payload.start.dateTime;
    const sameEnd = evt.end?.dateTime === payload.end.dateTime;
    return sameSubject && sameStart && sameEnd;
  });
}

async function upsertMapping(userId, icsUid, graphEventId, signature) {
  await db
    .delete(schema.eventsMapping)
    .where(and(eq(schema.eventsMapping.userId, userId), eq(schema.eventsMapping.icsUid, icsUid)));

  await db.insert(schema.eventsMapping).values({
    userId,
    icsUid,
    graphEventId,
    lastModified: signature,
  });
}

export async function syncUser(config) {
  if (!config?.userId || !config?.icsUrl || !config?.targetCalendarId) {
    throw new Error("Missing required sync config (userId, icsUrl, targetCalendarId)");
  }

  const accessToken = await getValidAccessToken(config.userId);
  if (!accessToken) {
    throw new Error("Graph token missing or expired; reconnect Office 365");
  }

  const source = await axios.get(config.icsUrl);
  const parsed = ical.parseICS(source.data);

  const icsEvents = Object.values(parsed).filter((item) => item?.type === "VEVENT" && item?.uid);

  const mappings = await db
    .select()
    .from(schema.eventsMapping)
    .where(eq(schema.eventsMapping.userId, config.userId));

  const mappingByUid = new Map(mappings.map((m) => [m.icsUid, m]));
  const seenUids = new Set();

  for (const event of icsEvents) {
    const uid = event.uid;
    seenUids.add(uid);

    const signature = toSignature(event);
    const payload = toGraphPayload(config, event);
    const existingMapping = mappingByUid.get(uid);

    if (existingMapping) {
      if (existingMapping.lastModified === signature) {
        continue;
      }

      try {
        await graphRequest(
          accessToken,
          "PATCH",
          `/me/events/${encodeURIComponent(existingMapping.graphEventId)}`,
          payload
        );

        await upsertMapping(config.userId, uid, existingMapping.graphEventId, signature);
        continue;
      } catch (err) {
        if (err?.response?.status !== 404) {
          throw err;
        }
      }
    }

    const fallback = await findExistingGraphEvent(accessToken, config, payload);
    if (fallback?.id) {
      await upsertMapping(config.userId, uid, fallback.id, signature);
      continue;
    }

    const created = await graphRequest(
      accessToken,
      "POST",
      `/me/calendars/${encodeURIComponent(config.targetCalendarId)}/events`,
      payload
    );

    await upsertMapping(config.userId, uid, created.data.id, signature);
  }

  for (const mapRow of mappings) {
    if (seenUids.has(mapRow.icsUid)) continue;

    try {
      await graphRequest(
        accessToken,
        "DELETE",
        `/me/events/${encodeURIComponent(mapRow.graphEventId)}`
      );
    } catch (err) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }

    await db
      .delete(schema.eventsMapping)
      .where(
        and(
          eq(schema.eventsMapping.userId, config.userId),
          eq(schema.eventsMapping.icsUid, mapRow.icsUid)
        )
      );
  }
}
