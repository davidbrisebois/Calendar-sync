import { verify } from "../../lib/jwt.js";
import { sendJson } from "../../lib/http.js";
import { getValidAccessToken } from "../../lib/graph-auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization;
    const user = verify(token);
    if (!user) return sendJson(res, 401, { error: "Unauthorized" });

    const accessToken = await getValidAccessToken(user.id);
    return sendJson(res, 200, { connected: Boolean(accessToken) });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
