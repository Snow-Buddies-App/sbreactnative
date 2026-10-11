#!/usr/bin/env bash
# Apply the migrations to a throwaway Postgres database and run the RLS tests.
# Usage: DATABASE_URL=postgres://postgres@localhost/postgres bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ADMIN_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
DB="sb_test_$$"

psql "$ADMIN_URL" -qc "create database $DB"
trap 'psql "$ADMIN_URL" -qc "drop database if exists $DB" >/dev/null' EXIT
DB_URL="${ADMIN_URL%/*}/$DB"

psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f tests/supabase_stub.sql 2>&1 | grep -v wal_level || true
for migration in migrations/*.sql; do
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$migration"
done
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f seed.sql
for test in tests/*_test.sql; do
  output="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$test" 2>&1)" || { echo "$output"; exit 1; }
  if ! grep -q 'TESTS PASSED' <<<"$output"; then
    echo "$output"
    exit 1
  fi
  echo "✓ $test"
done
echo "Database tests passed"
