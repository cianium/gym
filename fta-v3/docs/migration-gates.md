# Migration gates: 2.3.2 → FTA 3
Baseline main: de6147705259c507a9016d865fb4d35e1bbc25bc. The legacy API contains 77 route declarations (including aliases and a GET/POST match). Seven archive migrations define 27 tables, including infrastructure tables. The demo schema intentionally has separate Demo* tables and is NOT a conversion of production records.

| Legacy domain | Required parity before cutover | Current FTA status |
|---|---|---|
| Installer, bootstrap, brand, admin session | setup token, password hashing, session rotation, CSRF, throttles, no PII in public bootstrap | brand + static read-only demo |
| Athletes, OTP, phone changes | verified ownership, code TTL/attempt limits, SMS outbox, protected profile | sample display only |
| Training plans and progress | per-athlete ownership, validated write paths, progress history | sample plan display only |
| Consultations and messaging | atomic booking, cancellation, private threads, read state, SMS delivery status | sample appointment display only |
| Products, media, CMS, posts, revisions | scoped CRUD, upload allowlist, moderation, rollback | sample products only |
| Checkout, orders, gateway callbacks | verified phone, server pricing, idempotency, inventory transaction, authenticated lookup, gateway verification, reconciliation, no prod simulator | disabled / not ported |
| Digital entitlements | private storage, ownership, expiry, revocation, download authorization | not ported |
| Maintenance and backup | encrypted fail-closed export, tested recovery, audit events | not ported |
| Smart cards, wallets, lockers | new domain design; do not treat legacy coach card as membership access | out of scope for migration |

Before production: implement and independently test each gate; map IDs, timestamps, currency units, hashes, phone verification, foreign keys and files; migrate only from sanitized staging snapshot with reconciliation and rollback. Never copy legacy sessions or payment credentials into demo. All demo rows are fictional, not real identity data.
