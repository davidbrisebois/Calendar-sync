import { verify, sign } from "../../lib/jwt.js";
import { sendJson } from "../../lib/http.js";
import { buildAuthUrl } from "../../lib/graph-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) return sendJson(res, 401, { error: "Unauthorized" });

    const state = sign({ userId: user.id, purpose: "graph_oauth_state" });
    const authUrl = buildAuthUrl(state);

    return sendJson(res, 200, { authUrl });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
