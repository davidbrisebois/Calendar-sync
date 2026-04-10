# Synchroniseur de calendrier

Application Node.js pour synchroniser un flux ICS vers un calendrier Microsoft 365 (Graph).

## Base de données (Turso **ou** SQLite locale)

- **SQLite locale (prioritaire)**: `DATABASE_URL` (ex: `./data/app.db`)
- **Turso/libSQL**: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`

Si `DATABASE_URL` est présent, l'application crée automatiquement le dossier parent du fichier SQLite.

## Variables d'environnement principales

- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `DATABASE_URL` (mode SQLite)
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (mode Turso)
- `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_REDIRECT_URI`
- `MS_ENTRA_OAUTH_BASE_URL` (optionnel)
- `CRON_SECRET` (recommandé pour protéger `/api/cron`)
- `CRON_SCHEDULE` (optionnel, défaut `*/10 * * * *` dans Docker)

## Endpoints

- `GET/POST /api/setup` : statut et initialisation de la base
- `GET/POST /api/graph` : état, connexion et calendrier Graph
- `GET /api/graph/callback` : callback OAuth
- `GET /api/sync` : synchronisation manuelle utilisateur connecté
- `GET /api/cron` : synchronisation de tous les calendriers configurés (protégé par `CRON_SECRET` si défini)

En cas d'échec de sync lié à un token Graph expiré/perdu, un email d'alerte est envoyé à l'utilisateur.

## Lancement local

```bash
npm install
npm run dev
```

Vérification rapide:

```bash
npm run check
```

## Docker

Build:

```bash
docker build -t calendar-sync .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=/data/app.db \
  -e JWT_SECRET=change-me \
  -e CRON_SECRET=change-me \
  -e CRON_SCHEDULE="*/10 * * * *" \
  -v $(pwd)/data:/data \
  calendar-sync
```

Le conteneur démarre:

1. le serveur HTTP (`node server.js`)
2. un cron interne (`crond`) qui appelle `/api/cron` selon `CRON_SCHEDULE`.

## Traductions UI

Tous les textes de l'interface passent par un dictionnaire FR/EN dans `public/app.js`.
