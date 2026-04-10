function app() {
  return {
    email: "",
    code: "",
    token: localStorage.getItem("token") || "",
    icsUrl: "",
    targetCalendarId: "",
    titlePrefix: "",
    message: "",
    setupMessage: "",
    setupReady: false,
    showQuickLaunch: true,
    missingTables: [],

    async parseResponse(res) {
      const raw = await res.text();

      if (!raw) {
        return { error: `Réponse vide (HTTP ${res.status})` };
      }

      try {
        return JSON.parse(raw);
      } catch {
        return { error: raw };
      }
    },

    async boot() {
      await this.checkSetupStatus();
      if (!this.showQuickLaunch && this.token) {
        await this.loadConfig();
      }
    },

    async checkSetupStatus() {
      this.setupMessage = "";
      try {
        const res = await fetch("/api/setup/status");
        const data = await this.parseResponse(res);

        if (!data.configured) {
          this.showQuickLaunch = true;
          this.setupReady = false;
          this.setupMessage = "Database non configurée. Définissez DATABASE_URL ou TURSO_DATABASE_URL.";
          this.missingTables = [];
          return;
        }

        if (!data.reachable) {
          this.showQuickLaunch = true;
          this.setupReady = false;
          this.setupMessage = data.error || "Impossible de joindre la base.";
          this.missingTables = [];
          return;
        }

        this.missingTables = data.missingTables || [];
        this.showQuickLaunch = !data.initialized;
        this.setupReady = true;

        if (this.showQuickLaunch) {
          this.setupMessage = "Base accessible mais tables manquantes. Lancez l'initialisation.";
        }
      } catch (err) {
        this.showQuickLaunch = true;
        this.setupReady = false;
        this.setupMessage = err.message;
      }
    },

    async initializeDatabase() {
      this.setupMessage = "";
      try {
        const res = await fetch("/api/setup/init", { method: "POST" });
        const data = await this.parseResponse(res);

        if (data.error) {
          this.setupMessage = data.error;
          return;
        }

        this.setupMessage = "Initialisation terminée.";
        await this.checkSetupStatus();
      } catch (err) {
        this.setupMessage = err.message;
      }
    },

    async requestCode() {
      this.message = "";
      try {
        const res = await fetch("/api/auth/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: this.email }),
        });
        const data = await this.parseResponse(res);
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
        const data = await this.parseResponse(res);
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
        const data = await this.parseResponse(res);
        this.icsUrl = data.icsUrl || "";
        this.targetCalendarId = data.targetCalendarId || "";
        this.titlePrefix = data.titlePrefix || "";
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
            Authorization: this.token,
          },
          body: JSON.stringify({
            icsUrl: this.icsUrl,
            targetCalendarId: this.targetCalendarId,
            titlePrefix: this.titlePrefix,
          }),
        });
        const data = await this.parseResponse(res);
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
        const data = await this.parseResponse(res);
        if (data.error) this.message = data.error;
        else this.message = "Sync completed!";
      } catch (err) {
        this.message = err.message;
      }
    },
  };
}
