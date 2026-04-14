# Calendar Sync (ICS ➜ Microsoft 365)

This app lets you sync an ICS calendar feed to your Microsoft 365 calendar.

## What you can do

- Connect your Microsoft 365 account.
- Add your ICS calendar URL.
- Choose the destination Microsoft calendar.
- Run a manual synchronization.
- View recent synchronizations (date/time, success/failure) from the Configuration screen.

## Requirements

Your administrator (or the person deploying the app) must configure these environment variables:

- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Database (choose one):
  - `DATABASE_URL` (local SQLite)
  - or `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Microsoft 365 / Graph:
  - `MS_CLIENT_ID`
  - `MS_CLIENT_SECRET`
  - `MS_REDIRECT_URI`
  - `MS_ENTRA_OAUTH_BASE_URL` (optional)
- Cron (recommended):
  - `CRON_SECRET`
  - `CRON_SCHEDULE` (optional, default: `*/10 * * * *` in Docker)

## Getting started

1. Open the app in your browser.
2. Sign in with the code received by email.
3. In **Configuration**:
   - enter the ICS URL,
   - connect Microsoft 365,
   - choose the destination calendar,
   - save your settings.
4. Click **Sync now** to run your first synchronization.

## Automatic synchronization

If cron is enabled on the server, synchronization runs automatically based on the configured schedule.

## Quick troubleshooting

- **"No config found"**: the configuration has not been saved yet.
- **Microsoft 365 connection error**: reconnect your Office 365 account in the app.
- **Database not configured error**: contact your administrator to verify environment variables.

## AI assistance notice

This application was initially generated with assistance from **ChatGPT Codex**.

Before any production use, maintainers are responsible for:

- Performing a full human code review (logic, architecture, dependencies, and licenses).
- Running security validation (authentication, authorization, secret handling, data exposure, and logging).
- Confirming legal/compliance requirements applicable to their context (privacy, data retention, and regulatory constraints).
- Adding and maintaining automated tests, observability, and incident response procedures.

AI-generated output may contain errors or omissions. Final validation and operational responsibility remain with the deploying team.
