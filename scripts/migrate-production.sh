#!/usr/bin/env bash
# ==============================================================================
# PINNACLE E-COMMERCE - SAFE PRODUCTION DATABASE MIGRATION RUNNER
# Executes pending Prisma migrations within an isolated task prior to app rollout.
# ==============================================================================

set -euo pipefail

echo "======================================================================"
echo "Starting Database Migration Runner"
echo "Environment: ${NODE_ENV:-production}"
echo "======================================================================"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL environment variable is not defined."
  exit 1
fi

cd backend

# Step 1: Check pending migrations
echo "1. Checking database migration status..."
npx prisma migrate status || {
  echo "WARNING: Migration status check detected schema drift or unapplied history."
}

# Step 2: Apply pending migrations
echo "2. Applying pending migrations with 'prisma migrate deploy'..."
if npx prisma migrate deploy; then
  echo "✅ Migrations applied successfully."
else
  MIGRATION_EXIT=$?
  echo "❌ DATABASE MIGRATION FAILED with exit code: $MIGRATION_EXIT"
  echo "======================================================================"
  echo "EMERGENCY ROLLBACK & FORWARD-FIX RUNBOOK GUIDELINES:"
  echo "1. Do NOT proceed with application container rollout."
  echo "2. Inspect the failed migration SQL file in 'backend/prisma/migrations/'."
  echo "3. If a lock or constraint failed, mark the migration as resolved or create"
  echo "   a forward-fix migration using 'prisma migrate resolve --applied' or"
  echo "   'prisma migrate resolve --rolled-back'."
  echo "4. Review database locks: SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';"
  echo "======================================================================"
  exit $MIGRATION_EXIT
fi

echo "======================================================================"
echo "Database migration completed cleanly."
echo "======================================================================"

