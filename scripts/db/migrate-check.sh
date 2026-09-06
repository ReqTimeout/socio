#!/usr/bin/env bash
# scripts/db/migrate-check.sh — Scan Drizzle schema for missing production tables
#
# Usage (workstation):
#   bash scripts/db/migrate-check.sh
# Idempotent. Lists missing tables in production that Drizzle schema declares.

set -euo pipefail

VPS="${VPS:-root@130.254.47.93}"
DB_CONTAINER="${DB_CONTAINER:-rebicrj57r3afbg9knieq9ks}"
DB_NAME="${DB_NAME:-socio_smm}"
DB_USER="${DB_USER:-socio}"

# Get DB password from app container
APP_CT=$(ssh "$VPS" 'docker ps --format "{{.Names}}" | grep "^nqsjafrei" | head -1')
DB_URL=$(ssh "$VPS" "docker exec '$APP_CT' printenv SOCIO_DB_URL" 2>/dev/null)
DB_PASS=$(echo "$DB_URL" | sed -nE 's|.*://[^:]+:([^@]+)@.*|\1|p')

# 1. Extract list of tables declared by Drizzle schema
tables_local=$(grep -hoE 'mysqlTable\(\s*"[a-z_]+"' packages/db/src/schema/*.ts \
  | grep -v 'index.ts' \
  | sed -nE 's/.*"([a-z_]+)".*/\1/p' \
  | sort -u)

# 2. Get list of tables in production
tables_prod=$(ssh "$VPS" "docker exec -i $DB_CONTAINER mysql -u$DB_USER -p'$DB_PASS' -N -e 'SHOW TABLES;' $DB_NAME 2>/dev/null" \
  | sed 's/|//g' | sort -u)

# 3. Compare
missing=()
for t in $tables_local; do
  if ! echo "$tables_prod" | grep -qx "$t"; then
    missing+=("$t")
  fi
done

if [ ${#missing[@]} -eq 0 ]; then
  echo "✓ All Drizzle tables present in production."
  exit 0
fi

echo "✗ ${#missing[@]} tables MISSING from production:"
printf '  - %s\n' "${missing[@]}"
echo ""
echo "Apply scripts/db/migration-pre-deploy.sql (idempotent):"
echo "  scp scripts/db/migration-pre-deploy.sql \$VPS:/tmp/mig.sql"
echo "  ssh \$VPS 'docker exec -i $DB_CONTAINER mysql -u$DB_USER -p<DB_PASS> $DB_NAME < /tmp/mig.sql'"
echo "  bash scripts/db/migrate-check.sh  # verify"
