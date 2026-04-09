function app() {
  return {
    email: "",
    code: "",
    token: localStorage.getItem("token") || "",
    icsUrl: "",
    targetCalendarId: "",
    message: "",

    async requestCode() {
      this.message = "";
      try {
        const res = await fetch("/api/auth/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: this.email }),
        });
        const data = await res.json();
        if (data.error) this.message = data.error;
        else this.message = "Code sent to your email";
      } catch (err) {
        this.message = err.message;
      }
    },

    async login() {
      this.message = "";
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: this.email, code: this.code }),
        });
        const data = await res.json();
        if (data.error) this.message = data.error;
        else {
          this.token = data.token;
          localStorage.setItem("token", data.token);
          this.message = "Logged in!";
          this.loadConfig();
        }
      } catch (err) {
        this.message = err.message;
      }
    },

    async loadConfig() {
      this.message = "";
      try {
        const res = await fetch("/api/config", {
          headers: { Authorization: this.token },
        });
        const data = await res.json();
        this.icsUrl = data.icsUrl || "";
        this.targetCalendarId = data.targetCalendarId || "";
      } catch (err) {
        this.message = err.message;
      }
    },

    async saveConfig() {
      this.message = "";
      try {
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: this.token
          },
          body: JSON.stringify({
            icsUrl: this.icsUrl,
            targetCalendarId: this.targetCalendarId
          }),
        });
        const data = await res.json();
        if (data.error) this.message = data.error;
        else this.message = "Config saved!";
      } catch (err) {
        this.message = err.message;
      }
    },

    async syncNow() {
      this.message = "";
      try {
        const res = await fetch("/api/sync", {
          headers: { Authorization: this.token },
        });
        const data = await res.json();
        if (data.error) this.message = data.error;
        else this.message = "Sync completed!";
      } catch (err) {
        this.message = err.message;
      }
    },
  };
}