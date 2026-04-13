# Calendar Sync (ICS ➜ Microsoft 365)

Cette application vous permet de synchroniser un calendrier ICS vers votre calendrier Microsoft 365.

## Ce que vous pouvez faire

- Connecter votre compte Microsoft 365.
- Ajouter l'URL de votre calendrier ICS.
- Choisir le calendrier Microsoft de destination.
- Lancer une synchronisation manuelle.
- Consulter les dernières synchronisations (date/heure, succès/échec) dans l'écran de configuration.

## Prérequis

Votre administrateur (ou la personne qui déploie l'application) doit configurer les variables d'environnement suivantes :

- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Base de données (au choix) :
  - `DATABASE_URL` (SQLite locale)
  - ou `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Microsoft 365 / Graph :
  - `MS_CLIENT_ID`
  - `MS_CLIENT_SECRET`
  - `MS_REDIRECT_URI`
  - `MS_ENTRA_OAUTH_BASE_URL` (optionnel)
- Cron (recommandé) :
  - `CRON_SECRET`
  - `CRON_SCHEDULE` (optionnel, défaut : `*/10 * * * *` en Docker)

## Démarrage

1. Ouvrez l'application dans votre navigateur.
2. Connectez-vous par code reçu par email.
3. Dans **Configuration** :
   - renseignez l'URL ICS,
   - connectez Microsoft 365,
   - choisissez le calendrier de destination,
   - sauvegardez.
4. Cliquez sur **Synchroniser** pour lancer une première synchronisation.

## Synchronisations automatiques

Si le cron est activé côté serveur, la synchronisation se lance automatiquement selon la planification configurée.

## Dépannage rapide

- **"No config found"** : la configuration n'a pas encore été sauvegardée.
- **Erreur de connexion Microsoft 365** : reconnectez votre compte Office 365 dans l'application.
- **Erreur base de données non configurée** : contactez l'administrateur pour vérifier les variables d'environnement.
