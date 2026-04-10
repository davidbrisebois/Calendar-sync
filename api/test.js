import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await db.run(sql`SELECT 1 as ok`);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, result }));
  } catch (err) {
    console.error(err);

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
