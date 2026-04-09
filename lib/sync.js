import axios from "axios";
import ical from "node-ical";

export async function syncUser(config) {
  const res = await axios.get(config.icsUrl);
  const events = ical.parseICS(res.data);

  for (let k in events) {
    const e = events[k];
    if (e.type === "VEVENT") {
      console.log("SYNC EVENT:", e.uid, e.summary);
    }
  }
}