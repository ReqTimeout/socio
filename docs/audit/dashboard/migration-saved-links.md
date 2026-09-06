# Production migration: create `saved_links` table

**Date:** 2026-09-06  
**Trigger:** UX3 deployment surfaced 500 error — schema Drizzle `savedLinks`
references table `saved_links` di production, but it was never created
during rebuild migration. Table `favorites` exists (different schema) but
doesn't have `label` or `link` columns.

## What I did

Ran migration via direct `docker exec mysql` on the DB container
(rebicrj57r3afbg9knieq9ks), NOT via Drizzle migrate (would need rebuild
of dev environment).

```sql
CREATE TABLE IF NOT EXISTS saved_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(100) NOT NULL DEFAULT '',
  link TEXT NOT NULL,
  service_id INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX user_idx (user_id)
) ENGINE=InnoDB;
```

Schema matches `packages/db/src/schema/savedLinks.ts` exactly (int, varchar,
text, timestamp, default). No backfill needed — `favorites` table is empty
(no users have saved links yet).

## Followup

If this happens again on next deploy with new schema, need proper migration
pipeline (`pnpm db:migrate` or Drizzle Kit migrate in CI). Right now the
rebuild migration list in `docs/operations/` claims auto-create of new
tables but that's not actually run in production.

This is a broader ops gap — the schema-as-code migration story in
`packages/db/README.md` and `rebuild.ts` is aspirational, not enforced.
