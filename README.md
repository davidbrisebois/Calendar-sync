# Synchroniseur de calendrier

Application Node.js (API Vercel) + UI Alpine.js pour synchroniser un flux ICS vers un calendrier Office 365.

## Base de données avec Drizzle (Turso **ou** SQLite locale)

L'application utilise désormais Drizzle ORM avec deux modes:

- **Turso/libSQL** (mode cloud):
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
- **SQLite locale** (mode Docker/local):
  - `DATABASE_URL` (chemin fichier SQLite, ex: `./data/app.db`)

La priorité est donnée à `DATABASE_URL` si elle existe, sinon l'app utilise Turso.

## Variables d'environnement principales

- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (si mode Turso)
- `DATABASE_URL` (si mode SQLite locale)

## Schéma SQL

Le schéma est dans `db/schema.sql`.

> Note: la table `configs` contient `titlePrefix` (ex. `[CDLL]`) pour préfixer le titre des événements synchronisés.

## Exécuter en local

```bash
npm install
npm run dev
```

## Vérification rapide

```bash
npm run check
```

## Quicklaunch (auto-initialisation)

Au chargement de l'application:

- si la DB n'est pas configurée (`DATABASE_URL` ou `TURSO_DATABASE_URL`), une page Quicklaunch l'indique
- si la DB est joignable mais que les tables sont absentes, la page Quicklaunch propose de créer les tables
- si tout est prêt, la page de login s'affiche directement

Endpoints techniques:

- `GET /api/setup/status`
- `POST /api/setup/init`
