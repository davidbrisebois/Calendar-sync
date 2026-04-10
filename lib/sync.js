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
    event.rrule ? event.rrule.toString() : "",
  ].join("|");
}


function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function rruleValueMap(rruleString) {
  const line = (rruleString || "").split("\n").find((part) => part.startsWith("RRULE:"));
  if (!line) return null;

  const raw = line.replace("RRULE:", "");
  const values = {};
  for (const piece of raw.split(";")) {
    const [k, v] = piece.split("=");
    if (!k || !v) continue;
    values[k] = v;
  }
  return values;
}

function mapByDayToken(token) {
  const map = {
    MO: "monday",
    TU: "tuesday",
    WE: "wednesday",
    TH: "thursday",
    FR: "friday",
    SA: "saturday",
    SU: "sunday",
  };
  return map[token] || null;
}

function buildGraphRecurrence(event, timeZone) {
  if (!event.rrule) return null;

  const values = rruleValueMap(event.rrule.toString());
  if (!values?.FREQ) return null;

  const startDate = toIsoDate(event.start);
  const interval = Number(values.INTERVAL || 1);

  let range = {
    type: "noEnd",
    startDate,
    recurrenceTimeZone: timeZone,
  };

  if (values.UNTIL) {
    const untilDate = values.UNTIL.length >= 8 ? values.UNTIL.slice(0, 8) : values.UNTIL;
    const endDate = `${untilDate.slice(0, 4)}-${untilDate.slice(4, 6)}-${untilDate.slice(6, 8)}`;
    range = {
      type: "endDate",
      startDate,
      endDate,
      recurrenceTimeZone: timeZone,
    };
  } else if (values.COUNT) {
    range = {
      type: "numbered",
      startDate,
      numberOfOccurrences: Number(values.COUNT),
      recurrenceTimeZone: timeZone,
    };
  }

  if (values.FREQ === "DAILY") {
    return {
      pattern: { type: "daily", interval },
      range,
    };
  }

  if (values.FREQ === "WEEKLY") {
    const byDay = (values.BYDAY || "")
      .split(",")
      .map((item) => mapByDayToken(item))
      .filter(Boolean);

    const fallbackDay = mapByDayToken(["SU", "MO", "TU", "WE", "TH", "FR", "SA"][new Date(event.start).getUTCDay()]);

    return {
      pattern: {
        type: "weekly",
        interval,
        daysOfWeek: byDay.length ? byDay : [fallbackDay],
        firstDayOfWeek: "monday",
      },
      range,
    };
  }

  if (values.FREQ === "MONTHLY") {
    const byMonthDay = Number(values.BYMONTHDAY || 0);
    if (byMonthDay > 0) {
      return {
        pattern: {
          type: "absoluteMonthly",
          interval,
          dayOfMonth: byMonthDay,
        },
        range,
      };
    }
  }

  if (values.FREQ === "YEARLY") {
    return {
      pattern: {
        type: "absoluteYearly",
        interval,
        month: new Date(event.start).getUTCMonth() + 1,
        dayOfMonth: new Date(event.start).getUTCDate(),
      },
      range,
    };
  }

  return null;
}

function toGraphPayload(config, event) {
  const timeZone = event.start?.tz || event.end?.tz || "UTC";

  const recurrence = buildGraphRecurrence(event, timeZone);

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
    ...(recurrence ? { recurrence } : {}),
  };
}

async function graphRequest(accessToken, method, path, data, params) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 204) {
    return { status: res.status, data: {} };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.error?.message || `HTTP ${res.status}`);
    error.response = { status: res.status, data: json };
    throw error;
  }

  return { status: res.status, data: json };
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

  const sourceRes = await fetch(config.icsUrl);
  if (!sourceRes.ok) {
    throw new Error(`Unable to download ICS feed: HTTP ${sourceRes.status}`);
  }
  const sourceText = await sourceRes.text();
  const parsed = ical.parseICS(sourceText);

  const icsEvents = Object.values(parsed).filter((item) => item?.type === "VEVENT" && item?.uid && !item?.recurrenceid);

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
