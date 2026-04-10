#!/bin/sh
set -eu

mkdir -p /var/spool/cron/crontabs
CRON_SCHEDULE="${CRON_SCHEDULE:-*/10 * * * *}"

echo "${CRON_SCHEDULE} /app/scripts/run-cron-sync.sh >> /proc/1/fd/1 2>> /proc/1/fd/2" > /var/spool/cron/crontabs/root
chmod 600 /var/spool/cron/crontabs/root

crond
exec node server.js
