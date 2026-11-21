# ARASH Fitness — Release readiness assessment

**Decision: NO-GO for production; staging package only.**

## Verified locally
- PHP syntax checks on modified preflight and registration controller: passed.
- `php artisan route:list --path=athlete --json`: succeeds.
- Added `laravel_core/installer/release_preflight.php`: read-only check of PHP version/extensions, deployment configuration, critical files, permissions and accidental exposure of secrets in the web root.

## Unverified / blocking
- The current execution environment lacks PHP curl, gd, mbstring, xml, dom and pdo_mysql; the bundled smoke test fails with `could not find driver` for SQLite.
- No server `.env` was supplied (correct for a distributable package); configure production secrets on staging/host, not inside a distributable ZIP.
- Payment provider callbacks, duplicate callbacks, refunds, reconciliation, SMS provider acceptance, OTP registration concurrency, MySQL migrations, backup restore and real browser/mobile testing remain unverified.
- Compiled React frontend is available but editable source is not supplied.

## Staging verification checklist
1. Back up files and database; provision isolated staging database and HTTPS hostname.
2. Extract `laravel_core` outside the public web root and `public_html` into the document root. Confirm hosting routing and index bootstrap paths match the install guide.
3. Configure `.env` securely; run `php laravel_core/installer/release_preflight.php` from the project parent or `php installer/release_preflight.php` inside laravel_core.
4. Run `php artisan migrate --force` on disposable staging DB only after backup; run project tests with all required extensions.
5. Verify registration/login/logout, OTP retries and expiry, role separation, athlete plan ownership, progress submission, order ownership, inventory concurrency, bank callback idempotency and refund/reconciliation.
6. Verify backups can be restored; check mobile UI and accessibility; review server error logs.
7. Approve production only after all blocking tests pass, and keep a rollback plan.
