# ARASH Fitness — 2.3.2 (Staging)

Laravel/PHP backend with compiled frontend assets. This repository contains the source snapshot prepared for controlled staging and review. It is proprietary software; do not redistribute.

## Stack
- PHP 8.3+ / Laravel 13
- MySQL 8+ or MariaDB 10.6+
- Compiled frontend assets under `public_html/assets`

## Layout
- `laravel_core/`: Laravel application and tests (Composer dependencies intentionally excluded)
- `public_html/`: web document-root files and compiled assets
- `docs/`: release, deployment and historical documentation

## Local setup
1. Copy `laravel_core/.env.example` to `laravel_core/.env` and configure credentials.
2. From `laravel_core/`, run `composer install`.
3. Generate the app key with `php artisan key:generate`.
4. Configure the web server document root to `public_html/` and follow the current deployment guide in `docs/release/` / `docs/deployment/`.
5. Run migrations only after reviewing the staging deployment checklist.

Do not commit `.env`, credentials, logs, sessions, caches, database dumps, or runtime artifacts.

## Status
Staging candidate only. Static checks passed in the accompanying audit; production integrations (database concurrency, payment callbacks, SMS delivery, browser E2E, backup restore) still require environment-backed verification.
