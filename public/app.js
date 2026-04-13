function app() {
  const initialLangRaw = localStorage.getItem("lang") || "fr";
  const initialLang = initialLangRaw.startsWith("en") ? "en" : "fr";

  const dictionaries = {
    fr: {
      app_title: "Calendar Sync",
      lang_fr: "Français",
      lang_en: "English",
      logout: "Déconnexion",
      delete: "Supprimer",
      quicklaunch_title: "Quicklaunch: initialisation de la base",
      quicklaunch_missing_tables: "Tables manquantes:",
      init_tables: "Initialiser les tables",
      refresh_status: "Rafraîchir statut",
      login_title: "Connexion",
      email: "Courriel",
      send_code: "Envoyer le code",
      code: "Code",
      login: "Connexion",
      configuration: "Configuration",
      source_calendar: "Calendrier source",
      ics_url: "URL ICS",
      loading_calendars: "Chargement des calendriers...",
      connect_office: "Connecter Office 365",
      destination_calendar: "Calendrier destination",
      select_calendar: "Sélectionnez un calendrier",
      disconnect_office: "Se déconnecter de Microsoft 365",
      prefix: "Préfixe",
      title_prefix: "Préfixe du titre",
      save_config: "Sauvegarder",
      sync_now: "Synchroniser",
      recent_syncs: "Dernières synchronisations",
      sync_date: "Date",
      sync_status: "Statut",
      sync_trigger: "Déclenchement",
      sync_details: "Détails",
      status_success: "Réussie",
      status_failed: "Échec",
      trigger_manual: "Manuel",
      trigger_cron: "Automatique (cron)",
      no_sync_logs: "Aucune synchronisation enregistrée.",
      sync_last_refresh: "Dernière actualisation",
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
      deleting_account: "Suppression du compte et des données en cours...",
      delete_account_confirm: "Supprimer définitivement votre compte ?",
      oauth_error: "Erreur OAuth",
      empty_response: "Réponse vide",
    },
    en: {
      app_title: "Calendar Sync",
      lang_fr: "French",
      lang_en: "English",
      logout: "Log out",
      delete: "Delete",
      quicklaunch_title: "Quicklaunch: database setup",
      quicklaunch_missing_tables: "Missing tables:",
      init_tables: "Initialize tables",
      refresh_status: "Refresh status",
      login_title: "Login",
      email: "Email",
      send_code: "Send code",
      code: "Code",
      login: "Login",
      configuration: "Configuration",
      source_calendar: "Source calendar",
      ics_url: "ICS URL",
      loading_calendars: "Loading calendars...",
      connect_office: "Connect Office 365",
      destination_calendar: "Destination calendar",
      select_calendar: "Select a calendar",
      disconnect_office: "Sign out Microsoft 365",
      prefix: "Prefix",
      title_prefix: "Title prefix",
      save_config: "Save config",
      sync_now: "Sync now",
      recent_syncs: "Recent synchronizations",
      sync_date: "Date",
      sync_status: "Status",
      sync_trigger: "Trigger",
      sync_details: "Details",
      status_success: "Success",
      status_failed: "Failed",
      trigger_manual: "Manual",
      trigger_cron: "Automatic (cron)",
      no_sync_logs: "No synchronization recorded yet.",
      sync_last_refresh: "Last refresh",
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
      deleting_account: "Deleting account and data...",
      delete_account_confirm: "Delete your account permanently?",
      oauth_error: "OAuth error",
      empty_response: "Empty response",
    },
  };

  return {
    lang: initialLang,
    email: "",
    code: "",
    codeSent: false,
    token: localStorage.getItem("token") || "",
    icsUrl: "",
    targetCalendarId: "",
    configuredTargetCalendarId: "",
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
    isDeleting: false,
    syncLogs: [],
    syncLogsFetchedAt: 0,

    t(key) {
      const safeLang = this.lang?.startsWith("en") ? "en" : "fr";
      return dictionaries[safeLang]?.[key] || key;
    },

    setLang(nextLang) {
      this.lang = nextLang?.startsWith("en") ? "en" : "fr";
      localStorage.setItem("lang", this.lang);
    },

    formatSyncDate(value) {
      if (!value) return "";
      return new Date(Number(value)).toLocaleString(this.lang === "fr" ? "fr-FR" : "en-US");
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
      this.syncLogs = [];
      this.syncLogsFetchedAt = 0;
    },

    async parseResponse(res) {
      const raw = await res.text();
      if (!raw) {
        return { error: `${this.t("empty_response")} (HTTP ${res.status})` };
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
        this.message = `${this.t("oauth_error")}: ${oauthError}`;
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

        ["code", "state", "session_state", "error", "error_description"].forEach((k) => params.delete(k));
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
        this.message = data.error || this.t("code_sent");
        this.codeSent = !data.error;
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
        if (data.error) {
          this.message = data.error;
          return;
        }

        this.token = data.token;
        localStorage.setItem("token", data.token);
        this.message = this.t("logged_in");
        this.codeSent = false;
        await this.loadConfig();
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
      const ok = window.confirm(this.t("delete_account_confirm"));
      if (!ok) return;

      this.message = "";
      this.isDeleting = true;
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
      } finally {
        this.isDeleting = false;
      }
    },

    async loadCalendars() {
      this.officeLoading = true;
      try {
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
        this.calendars = (data.calendars || []).map((cal) => ({ ...cal, id: String(cal.id) }));

        const preferredId = String(this.configuredTargetCalendarId || this.targetCalendarId || "");
        const hasPreferred = preferredId && this.calendars.some((cal) => cal.id === preferredId);
        this.targetCalendarId = hasPreferred ? preferredId : this.calendars[0]?.id || "";
        this.configuredTargetCalendarId = "";
      } catch (err) {
        this.officeConnected = false;
        this.calendars = [];
        this.message = err.message;
      } finally {
        this.officeLoading = false;
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
        this.configuredTargetCalendarId = data.targetCalendarId ? String(data.targetCalendarId) : "";
        this.targetCalendarId = this.configuredTargetCalendarId;
        this.titlePrefix = data.titlePrefix || "";
        this.syncLogs = data.syncLogs || [];
        this.syncLogsFetchedAt = Date.now();

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
        this.message = data.error || this.t("config_saved");
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

        if (data.error) {
          this.message = data.error;
        } else {
          const stats = data.stats || {};
          this.message = `${this.t("sync_done")} (${stats.processed || 0}/${stats.total || 0})`;
        }
        await this.loadConfig();
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
