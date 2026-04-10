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
    officeConnected: false,
    calendars: [],

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

      const params = new URLSearchParams(window.location.search);
      const graphStatus = params.get("graph");
      const oauthCode = params.get("code");
      const oauthState = params.get("state");
      const oauthError = params.get("error");

      if (oauthError) {
        this.message = `Erreur OAuth: ${oauthError}`;
      }

      if (oauthCode && oauthState && this.token) {
        const exchangeRes = await fetch("/api/graph", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.token,
          },
          body: JSON.stringify({
            action: "exchange",
            code: oauthCode,
            state: oauthState,
          }),
        });
        const exchangeData = await this.parseResponse(exchangeRes);

        if (exchangeData.error) {
          this.message = exchangeData.error;
        } else {
          this.message = "Compte Office connecté.";
          await this.loadCalendars();
        }

        params.delete("code");
        params.delete("state");
        params.delete("session_state");
        params.delete("error");
        params.delete("error_description");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }

      if (graphStatus === "connected") {
        this.message = "Compte Office connecté.";
        params.delete("graph");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }
      if (graphStatus === "error") {
        this.message = "Erreur pendant la connexion Office 365.";
      }
    },

    async checkSetupStatus() {
      this.setupMessage = "";
      try {
        const res = await fetch("/api/setup");
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
        const res = await fetch("/api/setup", { method: "POST" });
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
          await this.loadConfig();
        }
      } catch (err) {
        this.message = err.message;
      }
    },

    async connectOffice() {
      this.message = "";
      try {
        const res = await fetch("/api/graph", {
          method: "POST",
          headers: { Authorization: this.token },
        });
        const data = await this.parseResponse(res);
        if (data.error) {
          this.message = data.error;
          return;
        }

        window.location.href = data.authUrl;
      } catch (err) {
        this.message = err.message;
      }
    },

    async loadCalendars() {
      const res = await fetch("/api/graph?mode=calendars", {
        headers: { Authorization: this.token },
      });
      const data = await this.parseResponse(res);

      if (data.error) {
        this.officeConnected = false;
        this.calendars = [];
        return;
      }

      this.officeConnected = true;
      this.calendars = data.calendars || [];
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

        await this.loadCalendars();
      } catch (err) {
        this.message = err.message;
      }
    },

    async saveConfig() {
      this.message = "";
      try {
        if (!this.officeConnected) {
          this.message = "Connectez d'abord Office 365.";
          return;
        }

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
