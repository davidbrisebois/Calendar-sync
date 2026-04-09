function app() {
  return {
    email: '',
    code: '',
    token: localStorage.getItem('token'),
    icsUrl: '',
    calendarId: '',

    async requestCode() {
      await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email })
      });
    },

    async login() {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, code: this.code })
      });

      const data = await res.json();
      this.token = data.token;
      localStorage.setItem('token', this.token);
      this.loadConfig();
    },

    async loadConfig() {
      const res = await fetch('/api/config', {
        headers: { Authorization: this.token }
      });
      const cfg = await res.json();
      this.icsUrl = cfg?.icsUrl || '';
      this.calendarId = cfg?.targetCalendarId || '';
    },

    async save() {
      await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.token
        },
        body: JSON.stringify({
          icsUrl: this.icsUrl,
          targetCalendarId: this.calendarId
        })
      });
    },

    async sync() {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: this.token }
      });
    }
  }
}