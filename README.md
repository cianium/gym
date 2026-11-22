<!--
  ARASH FITNESS
  A premium, single-tenant fitness coaching platform.
-->

<div align="center">

# ARASH FITNESS

### The operating system for a modern coaching business.

**Train smarter. Coach with clarity. Run your fitness business with confidence.**

<br />

![PHP](https://img.shields.io/badge/PHP-8.3%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![Database](https://img.shields.io/badge/MySQL-8%2B%20%7C%20MariaDB%2010.6%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-Single--Tenant-111827?style=for-the-badge)
![Release](https://img.shields.io/badge/Release-2.3.2-8B5CF6?style=for-the-badge)
![Status](https://img.shields.io/badge/Environment-Staging-CA8A04?style=for-the-badge)

<br />

[Architecture](#-architecture) · [Capabilities](#-product-capabilities) · [Security](#-security-first-by-design) · [Installation](#-installation) · [Deployment](#-deployment) · [QA Status](#-quality--release-status)

</div>

---

> **Built for coaches who want to spend less time managing tools and more time changing lives.**

ARASH Fitness is a white-label fitness coaching platform designed to bring the essential operations of a coaching business into one cohesive system: athlete management, training plans, progress tracking, consultations, private communication, digital products, checkout, payments, and administration.

It is engineered as a **single-tenant deployment**: each business installation runs with its own application configuration, database, domain, and operational credentials. The current release targets PHP shared hosting environments, including cPanel.

---

## ✦ Product capabilities

| Area | What it delivers |
|---|---|
| **Athlete portal** | Account registration, OTP-based phone verification, personal dashboard, orders, and progress history. |
| **Training management** | Coach-managed athlete records, training plans, and progress review. |
| **Consultations** | Coach availability, appointment slots, booking management, cancellation, and booking notifications. |
| **Private messaging** | Direct coach–athlete conversations with read-state support. |
| **Store & checkout** | Product catalogue, authenticated checkout, order lifecycle, and payment reconciliation. |
| **Payment gateways** | Integration paths for Zarinpal and Bank Saman (SEP), including callback handling. |
| **Digital products** | Private downloadable assets, access entitlements, download controls, and revocation. |
| **Content & community** | Media management, Explore-style posts, likes, comments, and moderation. |
| **Administration** | Protected management APIs, product and media operations, athlete and plan management, and system controls. |
| **Maintenance** | Version status, encrypted backup export, pre-upgrade snapshots, restore workflow, and revision recovery. |

### Designed around real business workflows

- **One verified identity:** sensitive purchase flows require an authenticated athlete account with a verified mobile number.
- **Safer checkout:** the payer's mobile number must match the verified account number.
- **Duplicate-request protection:** checkout uses idempotency keys to reduce duplicate orders and payment attempts.
- **Operational visibility:** consultation bookings and SMS delivery states can be reviewed by the coach.
- **Private by default:** athlete-specific records, messages, and digital assets are served through protected access paths.

---

## ◈ Architecture

The repository separates the Laravel application from the public web root. This is intentional: application code, environment configuration, and private runtime files should not be exposed as public web content.

```text
ARASH-FITNESS/
│
├── laravel_core/              # Laravel 13 application
│   ├── app/                   # Controllers, models, services, policies
│   ├── bootstrap/
│   ├── config/
│   ├── database/              # Migrations, factories and seeders
│   ├── installer/             # Controlled installation flow
│   ├── resources/              # Server-rendered application shell
│   ├── routes/                # Web, API and console routes
│   ├── tests/                 # Smoke, regression and feature tests
│   ├── composer.json
│   └── .env.example
│
├── public_html/               # Web-server document root
│   ├── assets/                # Compiled frontend assets
│   ├── media/                 # Public media location
│   ├── index.php
│   ├── spa-shell.html
│   └── .htaccess
│
├── docs/
│   ├── deployment/            # Deployment guidance
│   ├── history/               # Historical project records
│   └── release/               # Release notes, audits and QA reports
│
└── README.md
```

### Technology

| Layer | Technology |
|---|---|
| Backend | PHP 8.3+ |
| Application framework | Laravel 13 |
| Database | MySQL 8+ / MariaDB 10.6+ |
| API | Laravel HTTP routes and middleware |
| Frontend delivery | Compiled browser assets served from `public_html/` |
| Authentication | Session-based admin and athlete flows; OTP phone verification |
| Payments | Zarinpal and SEP integration paths |
| SMS | MeliPayamak integration |
| Hosting target | cPanel / PHP shared hosting |

**Frontend source note:** this repository currently contains compiled frontend assets, not the original React/TypeScript source project. The built interface is deployable as provided, but substantial frontend redevelopment should wait until the maintainable source is recovered or reconstructed.

---

## 🛡 Security-first by design

Security is treated as part of the product architecture—not as a final checklist.

- **Authentication and authorization:** separate athlete and administrator access paths.
- **CSRF protection:** state-changing protected operations use CSRF middleware.
- **Rate limiting:** sensitive endpoints such as login, OTP, checkout, and public interactions are throttled.
- **Verified checkout:** account authentication and verified phone ownership are required for purchases.
- **Idempotent transactions:** stable request keys help prevent duplicate checkout operations.
- **Payment callback handling:** gateway callbacks are routed through dedicated handlers and transaction state checks.
- **Private downloads:** digital assets use controlled access tokens and entitlement checks.
- **Encrypted backups:** backup export is designed to fail closed when a valid encryption key is unavailable; plaintext export is not an acceptable fallback.
- **Secret isolation:** credentials belong in server-side environment configuration, never in source control.

### Security configuration essentials

Keep these values private and configure them only in the deployment environment:

- `APP_KEY`
- Database credentials
- Zarinpal merchant credentials
- SEP terminal credentials
- MeliPayamak tokens and template IDs
- `BACKUP_ENCRYPTION_KEY`

**Backup key warning:** encrypted backups depend on the configured backup encryption key. Store it in a secure, independent location and preserve it for as long as those backups may need to be restored. Losing the key can make encrypted snapshots unrecoverable.

---

## ⚡ Installation

### Requirements

- PHP **8.3 or newer**
- Composer 2
- MySQL **8+** or MariaDB **10.6+**
- Required PHP extensions: Ctype, cURL, Fileinfo, Filter, GD, Hash, JSON, Mbstring, OpenSSL, PDO, Session, Tokenizer, and XML
- A web server configured to expose **only** `public_html/` as its document root

### 1. Get the code

```bash
git clone https://github.com/cianium/gym.git
cd gym
```

### 2. Install backend dependencies

```bash
cd laravel_core
composer install --no-dev --optimize-autoloader
```

For a development environment, omit `--no-dev` so the test and development dependencies are installed.

### 3. Configure the environment

```bash
cp .env.example .env
```

Set the application URL, database connection, administrator bootstrap credentials, payment/SMS credentials, and backup encryption key in `.env`.

Generate the Laravel application key:

```bash
php artisan key:generate
```

### 4. Prepare the database

Create a dedicated database and database user, then configure the credentials in `.env`.

Review the release and deployment checklist before running migrations. For a controlled deployment, take a database and file snapshot first, then run:

```bash
php artisan migrate --force
```

### 5. Configure the web root

Configure the domain's document root to point to:

```text
/path/to/project/public_html
```

Keep `laravel_core/`, `.env`, Composer files, logs, and other private application data outside the publicly served directory.

> **Important:** this repository is structured for a split application/public-root deployment. Do not point the domain at the repository root.

---

## 🚀 Deployment

The intended deployment model is an independent installation for each coaching business.

Each installation should have:

1. Its own domain or subdomain.
2. Its own database and database user.
3. Its own environment configuration and application key.
4. Its own payment and SMS credentials.
5. HTTPS enabled.
6. A tested backup and restore procedure.

### cPanel deployment checklist

- [ ] Upload the application while preserving the separation between `laravel_core/` and `public_html/`.
- [ ] Set the domain document root to `public_html/`.
- [ ] Select PHP 8.3+ and enable the required extensions.
- [ ] Create a dedicated MySQL database and user.
- [ ] Configure the production `.env` outside the public web root.
- [ ] Set `APP_ENV=production`, `APP_DEBUG=false`, and the correct `APP_URL`.
- [ ] Configure HTTPS and secure session cookies.
- [ ] Generate or securely provision the application key.
- [ ] Configure payment and MeliPayamak credentials using real provider values.
- [ ] Configure the backup encryption key and store a protected copy separately.
- [ ] Review and run database migrations after taking a snapshot.
- [ ] Configure the scheduler/cron jobs described in the deployment guide.
- [ ] Test athlete registration, OTP, checkout, payment callbacks, consultations, SMS, backup, and restore in an isolated staging environment.
- [ ] Verify mobile and desktop behavior before opening the installation to real customers.

The detailed deployment guide and release checklists in `docs/` take precedence over this overview.

---

## 🧪 Quality & release status

<div align="center">

### Current release: 2.3.2 · Staging candidate

**Not approved for production use yet.**

</div>

The repository includes automated checks, regression scripts, feature tests, and a MySQL staging test suite. The latest repository audit also records security and MySQL-compatibility fixes.

Previously recorded checks for this release include:

| Check | Recorded result |
|---|---:|
| PHP syntax checks | 105 / 105 passed |
| JavaScript syntax checks | 20 / 20 passed |
| Database-independent regression checks | 37 / 37 passed |
| Limited Laravel HTTP smoke checks | 4 / 4 passed |
| Limited client-side checkout checks | 4 / 4 passed |

These are **historical recorded results**, not a claim that every test was rerun against the current commit.

### Verification still required

The current release must remain in isolated staging until the following have been completed successfully:

- MySQL 8 / MariaDB migrations and feature tests
- Real database concurrency tests for bookings and checkout
- Payment gateway callback and reconciliation tests using provider-approved staging credentials
- Real MeliPayamak OTP and booking SMS delivery verification
- Encrypted backup export, decryption, and full restore test
- Browser-based end-to-end testing on mobile and desktop
- cPanel deployment verification, including scheduler and file permissions

See the latest [Repository Audit](docs/release/REPOSITORY_AUDIT_2026-11-22_FA.md) and [Final QA Report](docs/release/FINAL_QA_REPORT_FA.md) for the evidence, limitations, and release gates.

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [Repository Audit — 2026-11-22](docs/release/REPOSITORY_AUDIT_2026-11-22_FA.md) | Latest repository review, security findings, fixes, and remaining work |
| [Final QA Report](docs/release/FINAL_QA_REPORT_FA.md) | Quality status and production release decision |
| [Release 2.3.2](docs/release/RELEASE_2_3_2_FA.md) | Version scope, implementation notes, and recorded test results |
| [Release Checklist](docs/release/RELEASE_CHECKLIST_FA.md) | Pre-release verification checklist |
| [Staging Test & Deployment](docs/release/STAGING_TEST_AND_DEPLOY_FA.md) | Staging setup and operational test procedure |
| [Security & UI Changes](docs/release/CHANGES_SECURITY_UI_FA.md) | Security and interface change log |
| [Implementation Status](docs/release/IMPLEMENTATION_STATUS_FA.md) | Feature and implementation status |
| [Deployment Documentation](docs/deployment/README.md) | Deployment documentation index |

---

## 🔐 License & usage

This is **proprietary software**. The source is maintained in a private repository and is not offered under an open-source license.

No permission is granted to redistribute, resell, publish, or reuse the source code or compiled assets without written authorization from the rights holder.

---

<div align="center">

### ARASH FITNESS

**A stronger coaching business starts with a better system.**

<br />

Maintained by **[cianium](https://github.com/cianium)**

<sub>Laravel-powered · Single-tenant · Built for independent fitness businesses</sub>

</div>
