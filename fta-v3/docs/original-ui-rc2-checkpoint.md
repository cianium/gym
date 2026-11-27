# FTA Original UI RC2 — publication checkpoint

Release candidate archive: FTA-original-UI-RC2.zip; SHA-256 b21ae831a47d9f9bc96642810784aa0942f8a07a7b303030039157ccafe47eeb.

All 39 static files were uploaded as Git blobs and their returned SHA values matched local bytes. Exact publishing tree: 33fb9558e770801a969c3ab90918a745db3362b2. Snapshot branch demo/fta-original-rc2 at ff754f26e6589b1a0e5457f3f09da4f483edb3fd. Existing demo/fta-pages fast-forwarded to 1d4391d60899edebdd09eb8fbd54a57753fe68dc using the same tree. Generic demo superseded, history preserved. No writes to main or VPS; main was independently advanced to 5a8a177e82af392b55c066b21603cc51ef470fb6 (documentation commit).

RC2 preserves actual original React UI and independently restored athlete and coach views. Fixed six stale ESM imports, relative Vite preload, product/post route IDs, synthetic account profile, demo API likes/saves, local CMS supported operations and rejection of unsupported settings, registration feedback and bounded portal styling. Production auth, payments, SMS, uploads/downloads, backups, full moderation and full Next.js/NestJS migration remain open. All data synthetic.

QA: 27 JS syntax checks; 18 ESM modules linked (not executed); 38 previous + 37 new mock API response checks; local static HTTP /gym/ serving; CRC valid. Browser execution blocked by environment policy, so no screenshot comparison or real browser QA result. Browser workflow pinned to exact Pages commit and updated for 11 routes and four viewport sizes; no passing run confirmed yet.

Pages configuration still needs verification. The repository is private; do not change visibility. Settings > Pages > Deploy from a branch > demo/fta-pages > /(root). Expected URL https://cianium.github.io/gym/; review https://cianium.github.io/gym/review.html. Public URL was not accessible from the web check; no claim of live deployment. Do not deploy VPS before review.
