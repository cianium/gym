# FTA — Original Product Restoration RC3

**Status: static review candidate; NOT production software or a Next.js/NestJS migration.**

Built from the real AI Studio design and 2.3.2 React bundles and Blade-derived athlete / coach screens. Preserve the black/gold original Home, Shop, Explore, Account, Smart Card and Admin Studio; don't replace them with the generic dashboard. All data is fictional. The preview is NOT authentication or authorization for real records. Do not enter actual personal details or passwords. Real payment, SMS, upload/download, backup/restore and unsupported operations are disabled. Comments are queued in local demo state; complete moderation is not implemented. No production backend is connected.

## Review
Extract all files into the same directory and serve over HTTP. Open `review.html` for the route index, or `index.html` for the original public UI. Hash routes include `#/shop`, `#/explore`, `#/account` (also `#/profile`), `#/cart`, `#/admin`. Standalone pages: `athlete.html`, `athlete-register.html`, `coach-athletes.html`, `coach-schedule.html`. Mock OTP 123456. Registration redirects to the athlete portal. Admin state changes and interactions are local; browser storage can be cleared to reset. RC2 uses a new storage key. The small demo-only notice is intentionally visible. Font fallback depends on browser; exact visual fidelity not certified.

## RC2 changes
- Correct six stale static ESM imports pointing to a missing old main bundle, and resolve lazy preload paths relative to the deployed JS module (including /gym/).
- Preserve the original UI; initialize the customer profile with synthetic data; support explicit product and Explore deep-link IDs.
- Match post-like API response and desired-state semantics; persist likes and saved posts; record synthetic moderated comments without displaying unapproved content.
- Upsert supported product/post/brand/coach/theme/section/module changes, support product/post deletion and local reset; reject unsupported settings explicitly instead of false success. Strip sensitive config keys and external URLs from stored settings; do not store passwords or real contact fields in these API paths. Demo text inputs may still be stored locally; use only fake data.
- No native fetch fallback for unexpected paths. Refine small-screen portal layout, focus states, and registration feedback. Do not claim real server access control.

## Verification
27 JS syntax checks; 18 ESM modules linked, including all six lazy views; 75 mock API HTTP response checks across two independent suites and domain assertions; relative HTML asset links and preload dependency references verified; local HTTP /gym/ file serving verified. Chromium was launched but navigation was blocked by ERR_BLOCKED_BY_ADMINISTRATOR. Therefore no actual browser visual acceptance, pixel match, or mobile layout certification. Full production migration remains open. The demo-specific corrections are not a replacement for production code review.

## GitHub Pages
Publish only this static package at the root of a dedicated publishing branch (including .nojekyll). Keep the main repository private. GitHub Pages needs an eligible plan for a private repository and must be enabled under Settings > Pages. No VPS deployment until visual approval. The exact candidate is not live until the publishing tree is pushed, Pages is configured, and its actual URL is verified.

## RC3 corrections
Synthetic login now selects an existing account by its demo email or numeric ID; standalone registration no longer requests passwords or a real number. Validate training dates, duplicate days, sets, progress dates, record capacity, malformed requests, and account reassignment; guard portal submissions and report partial data errors. Cart quantity is bounded by sample stock. Browser execution and live Pages access remain unverified.
