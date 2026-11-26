# FTA Platform — v3 foundation

Fitness Training & Administration · Train. Manage. Grow.

**Status:** architectural foundation / isolated demonstration only. Not a feature-complete migration or production release. The existing Laravel code remains untouched on this branch and on main.

Architecture decision: Next.js App Router + NestJS, TypeScript, modular monolith. PostgreSQL, Prisma, Redis/BullMQ, secure sessions, tenant scoping, and payment/SMS integrations are planned, not implemented here. The legacy 2.3.2 API contracts and security invariants must be ported and tested before replacing the old application. The Nov 15 React source is a component reference, not an authoritative checkout implementation.

Run on a Linux host with Docker Compose v2: from this directory, run docker compose up --build. The demo binds only to 127.0.0.1:3080; expose it via an HTTPS reverse proxy only after build/test verification. The API is internal to Compose. No real accounts, payments, SMS or personal information are used. Use SSH port forwarding for private review. This initial scaffold has no dependency lockfiles and needs dependency resolution, lockfile generation, security audit and build verification.

FTA is a provisional product name; trademark and domain checks pending. Do not merge or deploy automatically.
