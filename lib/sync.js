import axios from "axios";
import ical from "node-ical";

export async function syncUser(config) {
  const res = await axios.get(config.icsUrl);
  const events = ical.parseICS(res.data);

  for (const key in events) {
    const event = events[key];
    if (event.type === "VEVENT") {
      const prefixedSummary = `${config.titlePrefix || ""}${
        config.titlePrefix ? " " : ""
      }${event.summary || ""}`.trim();

      console.log("SYNC EVENT:", event.uid, prefixedSummary);
    }
  }
}
