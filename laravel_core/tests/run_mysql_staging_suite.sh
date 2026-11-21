#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."

# DESTRUCTIVE TEST SUITE: Laravel DatabaseMigrations runs migrate:fresh.
# Only a separate disposable MySQL DB is allowed. Never use production credentials.
if [[ "${DB_CONNECTION:-}" != "mysql" ]]; then
  echo 'ABORT: Set DB_CONNECTION=mysql for a disposable MySQL test database.' >&2
  exit 2
fi
if [[ ! "${DB_DATABASE:-}" =~ (^test_|_test($|_)) ]]; then
  echo 'ABORT: DB_DATABASE must have test_ prefix or _test suffix/segment.' >&2
  exit 2
fi
if [[ "${APP_ENV:-}" != "testing" ]]; then
  echo 'ABORT: Set APP_ENV=testing explicitly.' >&2
  exit 2
fi
if [[ ! -f vendor/bin/phpunit ]]; then
  echo 'ABORT: PHPUnit is not installed. On a separate dev machine run composer install (with dev dependencies).' >&2
  exit 2
fi
if ! php -m | grep -qi '^pdo_mysql$'; then
  echo 'ABORT: pdo_mysql PHP extension is missing.' >&2
  exit 2
fi
if ! php -m | grep -qi '^pcntl$'; then
  echo 'ABORT: pcntl PHP extension is missing (needed for parallel tests).' >&2
  exit 2
fi
# Empty DB must be dedicated and disposable. Check twice before destructive migrations.
printf 'DANGER: tests will DROP ALL TABLES in MySQL database "%s" at "%s".\n' "$DB_DATABASE" "${DB_HOST:-127.0.0.1}"
if [[ "${ARASH_ALLOW_DESTRUCTIVE_TESTS:-}" != 'YES_DISPOSABLE_DATABASE' ]]; then
  echo 'ABORT: Export ARASH_ALLOW_DESTRUCTIVE_TESTS=YES_DISPOSABLE_DATABASE after verifying the DB is disposable.' >&2
  exit 2
fi
php vendor/bin/phpunit --configuration phpunit.mysql.xml --filter 'VerifiedCheckoutFlowTest|MySqlConcurrencyTest|CoachingEnhancementsTest'
