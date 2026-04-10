import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import http from "node:http";

import authRequest from "./api/auth/request.js";
import authVerify from "./api/auth/verify.js";
import configHandler from "./api/config.js";
import cronHandler from "./api/cron.js";
import graphHandler from "./api/graph.js";
import graphCallbackHandler from "./api/graph/callback.js";
import initHandler from "./api/init.js";
import setupHandler from "./api/setup.js";
import syncHandler from "./api/sync.js";
import userHandler from "./api/user.js";

const publicDir = path.join(process.cwd(), "public");

const routes = {
  "/api/auth/request": authRequest,
  "/api/auth/verify": authVerify,
  "/api/config": configHandler,
  "/api/cron": cronHandler,
  "/api/graph": graphHandler,
  "/api/graph/callback": graphCallbackHandler,
  "/api/init": initHandler,
  "/api/setup": setupHandler,
  "/api/sync": syncHandler,
  "/api/user": userHandler,
};

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  res.setHeader("Content-Type", contentType(filePath));
  fs.createReadStream(filePath).pipe(res);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    req.query = Object.fromEntries(requestUrl.searchParams.entries());
    req.body = await parseBody(req);

    const handler = routes[requestUrl.pathname];
    if (handler) {
      await handler(req, res);
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      return serveFile(res, path.join(publicDir, "index.html"));
    }

    if (requestUrl.pathname.startsWith("/public/")) {
      return serveFile(res, path.join(process.cwd(), requestUrl.pathname));
    }

    res.statusCode = 404;
    res.end("Not found");
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message }));
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  process.stdout.write(`Server listening on ${port}\n`);
});
