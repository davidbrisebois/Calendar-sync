function app() {
  const dictionaries = {
    fr: {
      code_sent: "Code envoyé par courriel.",
      logged_in: "Connecté.",
      office_connected: "Compte Office connecté.",
      office_error: "Erreur pendant la connexion Office 365.",
      office_disconnected: "Compte Office déconnecté.",
      account_deleted: "Compte supprimé.",
      db_not_configured: "Base non configurée. Définissez DATABASE_URL ou TURSO_DATABASE_URL.",
      db_unreachable: "Impossible de joindre la base.",
      db_missing_tables: "Base accessible mais tables manquantes. Lancez l'initialisation.",
      init_done: "Initialisation terminée.",
      config_saved: "Configuration sauvegardée.",
      sync_done: "Synchronisation terminée.",
      connect_office_first: "Connectez d'abord Office 365.",
      syncing: "Synchronisation en cours...",
    },
    en: {
      code_sent: "Code sent by email.",
      logged_in: "Logged in.",
      office_connected: "Office account connected.",
      office_error: "Error during Office 365 connection.",
      office_disconnected: "Office account disconnected.",
      account_deleted: "Account deleted.",
      db_not_configured: "Database not configured. Set DATABASE_URL or TURSO_DATABASE_URL.",
      db_unreachable: "Unable to reach database.",
      db_missing_tables: "Database reachable but tables are missing. Run initialization.",
      init_done: "Initialization completed.",
      config_saved: "Config saved.",
      sync_done: "Sync completed.",
      connect_office_first: "Please connect Office 365 first.",
      syncing: "Sync in progress...",
    },
  };

  return {
    lang: localStorage.getItem("lang") || "fr",
    email: "",
    code: "",
    codeSent: false,
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
    officeLoading: false,
    calendars: [],
    isSyncing: false,
    syncProgress: 0,

    t(key) {
      return dictionaries[this.lang]?.[key] || key;
    },

    setLang(nextLang) {
      this.lang = nextLang;
      localStorage.setItem("lang", nextLang);
    },

    logout() {
      this.token = "";
      this.code = "";
      this.codeSent = false;
      this.officeConnected = false;
      this.officeLoading = false;
      this.calendars = [];
      localStorage.removeItem("token");
      this.message = "";
    },

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
          body: JSON.stringify({ action: "exchange", code: oauthCode, state: oauthState }),
        });
        const exchangeData = await this.parseResponse(exchangeRes);

        if (exchangeData.error) {
          this.message = exchangeData.error;
        } else {
          this.message = this.t("office_connected");
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

      if (graphStatus === "connected") this.message = this.t("office_connected");
      if (graphStatus === "error") this.message = this.t("office_error");
    },

    async checkSetupStatus() {
      this.setupMessage = "";
      try {
        const res = await fetch("/api/setup");
        const data = await this.parseResponse(res);

        if (!data.configured) {
          this.showQuickLaunch = true;
          this.setupReady = false;
          this.setupMessage = this.t("db_not_configured");
          this.missingTables = [];
          return;
        }

        if (!data.reachable) {
          this.showQuickLaunch = true;
          this.setupReady = false;
          this.setupMessage = data.error || this.t("db_unreachable");
          this.missingTables = [];
          return;
        }

        this.missingTables = data.missingTables || [];
        this.showQuickLaunch = !data.initialized;
        this.setupReady = true;
        if (this.showQuickLaunch) this.setupMessage = this.t("db_missing_tables");
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

        this.setupMessage = this.t("init_done");
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
        else {
          this.codeSent = true;
          this.message = this.t("code_sent");
        }
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
          this.message = this.t("logged_in");
          this.codeSent = false;
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

    async disconnectOffice() {
      this.message = "";
      try {
        const res = await fetch("/api/graph", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.token,
          },
          body: JSON.stringify({ action: "disconnect" }),
        });
        const data = await this.parseResponse(res);
        if (data.error) {
          this.message = data.error;
          return;
        }

        this.officeConnected = false;
        this.officeLoading = false;
        this.calendars = [];
        this.targetCalendarId = "";
        this.message = this.t("office_disconnected");
      } catch (err) {
        this.message = err.message;
      }
    },

    async deleteAccount() {
      const ok = window.confirm(this.lang === "fr" ? "Supprimer définitivement votre compte ?" : "Delete your account permanently?");
      if (!ok) return;

      this.message = "";
      try {
        const res = await fetch("/api/user", {
          method: "DELETE",
          headers: { Authorization: this.token },
        });
        const data = await this.parseResponse(res);
        if (data.error) {
          this.message = data.error;
          return;
        }

        this.logout();
        this.message = this.t("account_deleted");
      } catch (err) {
        this.message = err.message;
      }
    },

    async loadCalendars() {
      this.officeLoading = true;
      const res = await fetch("/api/graph?mode=calendars", {
        headers: { Authorization: this.token },
      });
      const data = await this.parseResponse(res);

      if (data.error) {
        this.officeConnected = false;
        this.officeLoading = false;
        this.calendars = [];
        return;
      }

      this.officeConnected = true;
      this.calendars = data.calendars || [];

      if (this.targetCalendarId) {
        const exists = this.calendars.some((cal) => String(cal.id) === String(this.targetCalendarId));
        if (!exists && this.calendars.length) {
          this.targetCalendarId = this.calendars[0].id;
        }
      }

      if (!this.targetCalendarId && this.calendars.length) {
        this.targetCalendarId = this.calendars[0].id;
      }

      this.officeLoading = false;
    },

    async loadConfig() {
      this.message = "";
      this.officeLoading = true;
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
        this.officeLoading = false;
        this.message = err.message;
      }
    },

    async saveConfig() {
      this.message = "";
      try {
        if (!this.officeConnected) {
          this.message = this.t("connect_office_first");
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
        else this.message = this.t("config_saved");
      } catch (err) {
        this.message = err.message;
      }
    },

    async syncNow() {
      this.message = this.t("syncing");
      this.isSyncing = true;
      this.syncProgress = 5;

      const timer = setInterval(() => {
        if (this.syncProgress < 90) this.syncProgress += 5;
      }, 250);

      try {
        const res = await fetch("/api/sync", {
          headers: { Authorization: this.token },
        });
        const data = await this.parseResponse(res);
        clearInterval(timer);
        this.syncProgress = 100;

        if (data.error) this.message = data.error;
        else {
          const stats = data.stats || {};
          this.message = `${this.t("sync_done")} (${stats.processed || 0}/${stats.total || 0})`;
        }
      } catch (err) {
        clearInterval(timer);
        this.message = err.message;
      } finally {
        this.isSyncing = false;
        setTimeout(() => {
          this.syncProgress = 0;
        }, 500);
      }
    },
  };
}
