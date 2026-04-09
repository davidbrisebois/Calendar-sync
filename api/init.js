import db from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await db.execute("SELECT 1");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      msg: "DB connected",
      test: result
    }));
  } catch (err) {
    console.error(err);

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}