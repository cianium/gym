# FTA Platform — 3.0.0-alpha.1

Fitness Training & Administration · Train. Manage. Grow.

Independent demo foundation using Next.js, NestJS, PostgreSQL and Prisma. The three demo pages (/, /admin, /athlete) display fictional data from a separate PostgreSQL schema; no real users, login, mutations, payments, SMS, uploads or production data migration. Legacy Laravel 2.3.2 remains unchanged. See docs/migration-gates.md for feature parity and security requirements. Redis/BullMQ, production auth, tenant isolation and full feature migration remain planned.

## Local / private VPS review

Requirements: Linux with Docker Engine and modern Docker Compose v2 (inline Dockerfile support). In the fta-v3 directory:

```sh
umask 077
printf 'FTA_DEMO_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
docker compose up --build -d
docker compose ps
curl -fsS http://127.0.0.1:3080/
```

Only generate the password on first setup; retain it with the DB volume. Database and API ports are not published. Web listens on host loopback; use SSH forwarding for private review. Do not expose publicly until build, tests, dependency audit, proxy HTTPS and access requirements are reviewed. Never connect this demo to a real database. To stop: docker compose down (keeps data).

This branch does not yet include dependency lockfiles; npm resolution and Docker runtime verification are outstanding. FTA is a provisional brand. No automatic merge/deploy.
