import { persistTokenFromCode } from "../../lib/graph-auth.js";
import { verify } from "../../lib/jwt.js";

function redirect(res, location) {
  if (typeof res.redirect === "function") {
    return res.redirect(302, location);
  }
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

export default async function handler(req, res) {
  try {
    const { code, state } = req.query || {};
    if (!code || !state) return redirect(res, "/?graph=error");

    const payload = verify(state);
    if (!payload || payload.purpose !== "graph_oauth_state" || !payload.userId) {
      return redirect(res, "/?graph=error");
    }

    await persistTokenFromCode(payload.userId, code);
    return redirect(res, "/?graph=connected");
  } catch (err) {
    console.error(err);
    return redirect(res, "/?graph=error");
  }
}
