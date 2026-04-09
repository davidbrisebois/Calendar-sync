const ical = require('node-ical');
const axios = require('axios');

exports.syncUser = async (config) => {
  const res = await axios.get(config.icsUrl);
  const events = ical.parseICS(res.data);

  for (let k in events) {
    const e = events[k];
    if (e.type === 'VEVENT') {
      console.log("Event:", e.uid, e.summary);
    }
  }
};