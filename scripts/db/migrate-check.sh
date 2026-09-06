#!/usr/bin/env bash
# scripts/db/migrate-check.sh — Scan Drizzle schema for missing production tables
#
# Usage (workstation):
#   bash scripts/db/migrate-check.sh
# Uses ssh + docker exec on VPS.
# Output: list of missing tables.
# Idempotent — safe to run anytime to check drift.

set -euo pipefail

VPS="${VPS:-root@130.254.47.93}"
DB_CONTAINER="${DB_CONTAINER:-rebicrj57r3afbg9knieqq9ks}"
# Drizzle mysqlTable names from packages/db/src/schema/*.ts (excluding index.ts)
tables=$(grep -hoE 'mysqlTable\(\s*"[a-z_]+"' packages/db/src/schema/*.ts \
  | grep -v 'index.ts' \
  | sed 's/.*"\(.*\)"/\1/' \
  | sort -u)

# Get production table list via ssh
prod=$(ssh "$VPS" "docker exec -i $DB_CONTAINER mysql -u'root' -p\\\"\\\$(docker exec \\\$(docker ps -f ancestor=nqsjafrei6k8dkup1pxkcuwf --format '{{.Names}}' | head -1) printenv SOCIO_DB_URL 2>/dev/null | sed -n 's|.*://[^:]*:\\\\([^@]*\\\\)@.*|\\\\1|p')\\\" -N -e 'SHOW TABLES;' socio_smm" 2>/dev/null | sed 's/|//g' | sort -u)

missing=()
for t in $tables; do
  if ! echo "$prod" | grep -qx "$t"; then
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
echo "Apply migration SQL:"
echo "  scp scripts/db/migration-pre-deploy.sql \$VPS:/tmp/mig.sql"
echo "  ssh \$VPS 'docker cp /tmp/mig.sql $DB_CONTAINER:/tmp/mig.sql'"
echo "  ssh \$VPS 'docker exec -i $DB_CONTAINER mysql -u'\\''root'\\'' -p\\\"\\\$DB_PASS\\\" socio_smm < /tmp/mig.sql'"
echo "  bash scripts/db/migrate-check.sh  # verify"
