# Phase 07 — Training, consultation and communication integration

## Scope and source
Base: original Next.js source branch 5294c434e483e6f0d560c5cdcabe01c4b5741837, including PostgreSQL training core. Consultation and message contracts taken from legacy CoachScheduleController, CoachMessageController and routes/api.php on main/audit branch. RC4 Pages commit 2178cd535ade7c285588016c27a61b7532dab537 is unchanged.

## Operational staging
- NestJS implements 15 additional endpoints: athlete availability, booking list/create/cancel, messages list/send/read; admin slots list/create/disable, bookings list/status, athlete-specific messages list/send/read.
- PostgreSQL adds four tables and an eligibility flag. Row locks and unique active slot enforce single reservation, including completed bookings; slot creation serializes overlap checks. Cancellation releases the slot, terminal status cannot reopen. Strict timestamp offset input and legacy booking cutoff.
- Messaging enforces athlete identity and admin role, private thread separation, read receipts and database rate counters. No SMS delivery claimed.
- Booking eligibility defaults false. Only CLI on isolated staging DB may grant eligibility to synthetic example.test accounts. It does not verify a phone. Real OTP/SMS/outbox and phone-ownership migration remain release blockers.
- Next /workspace is a separate operational athlete/coach workspace using real PostgreSQL-backed API, not the original storefront's demo runtime. It supports login, forced password rotation, logout, coach athlete creation, structured plan editor, progress, consultation slots/status, messages and read receipts.
- Next /api/workspace has fixed upstream loopback URL, method/path allowlist, bounded JSON, exact Origin for mutations, no cache, HttpOnly SameSite Strict session cookie. Secure cookie for HTTPS. Tokens do not reach JS. A shared proxy peer IP may cause staging rate limits across users; production needs a trusted ingress and rate limiter. No real-data or public access approval.

## Private staging startup
Use only disposable DB fta_training_staging. API env FTA_MODE=training-staging, FTA_STAGING_ACK=isolated-test-only, DATABASE_URL pointed to this DB. Install, generate, compile, migrate and provision synthetic admin as described in training-migration.md. To grant synthetic booking: node dist/training/eligibility.js athlete1@example.test. No API grant.
Next env FTA_WORKSPACE_MODE=isolated-staging, FTA_WORKSPACE_ORIGIN=http://127.0.0.1:3000, FTA_WORKSPACE_API_URL=http://127.0.0.1:4000. Install, typecheck, build, start on loopback. /workspace. Use private local access only; do not expose API. No production or VPS deployment.
CI: .github/workflows/fta-integration-ci.yml uses disposable PostgreSQL 17, real Nest/Next compile, training and communication HTTP tests, Chromium BFF and workflow tests.

## Open parity gates
Original storefront and CMS still use synthetic adapter, and no operational purchase/order/download, OTP, SMS outbox, content/SEO/white-label, public consultation requests, legacy record import, independent coach RBAC, dependency lock/audit, full visual review, payment/provider staging, backups or production rollout. Legacy phone verification cannot be bypassed in production; no production runtime mode exists. Original RC4 Pages stays independent. No merge or deploy.
