import { verify, sign } from "../lib/jwt.js";
import { sendJson } from "../lib/http.js";
import { buildAuthUrl, getValidAccessToken, listUserCalendars } from "../lib/graph-auth.js";

function getUser(req) {
  const token = req.headers.authorization;
  return verify(token);
}

export default async function handler(req, res) {
  try {
    const user = getUser(req);
    if (!user) return sendJson(res, 401, { error: "Unauthorized" });

    if (req.method === "POST") {
      const state = sign({ userId: user.id, purpose: "graph_oauth_state" });
      const authUrl = buildAuthUrl(state);
      return sendJson(res, 200, { authUrl });
    }

    if (req.method === "GET") {
      const mode = req.query?.mode || "status";
      const accessToken = await getValidAccessToken(user.id);

      if (mode === "status") {
        return sendJson(res, 200, { connected: Boolean(accessToken) });
      }

      if (mode === "calendars") {
        if (!accessToken) return sendJson(res, 401, { error: "Graph not connected" });
        const calendars = await listUserCalendars(accessToken);
        return sendJson(res, 200, { calendars });
      }

      return sendJson(res, 400, { error: "Unsupported mode" });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
