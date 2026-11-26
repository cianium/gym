# Original product restoration — checkpoint (2026-11-26)

The generic demo/fta-pages dashboard is not the reference UI. Do not replace the original public site, store, Explore, customer account or Admin Studio with it. Preserve the black/gold React design and the separate athlete and coach workflows.

Sources: AI Studio Nov 15 editable React 2.2.0, GitHub Ready / Secure Checkout 2.3.2 archives and main for later operational fixes. The original static branch has the checkout syntax correction at fe767defd7519c783cc26cd3245731a24300411a.

An isolated 39-file static restoration candidate was built from the uploaded archives and recovery assets outside GitHub. It preserves the compiled public UI and restores the four legacy athlete/register/coach-athletes/coach-schedule views as separate static pages, with demo-only mock data and black/gold styling. It is not a Next.js build. The candidate archive is FTA-restored-original-UI-preview.zip (SHA-256 5ee525d886a4d4bf8b9eb59e8466b5937b9382973ef54f22230fe7b73cf2dc87). The archive itself is not committed by this documentation change.

Local verification: 27/27 JS syntax checks, 38 mock API HTTP response checks plus domain assertions and external-request blocking, no missing relative HTML assets, ZIP CRC valid. Chromium launched but navigation was blocked by environment policy, so no browser E2E or visual match certification. No full editable-source build or complete backend port was performed.

Next gates: publish the isolated verified static tree only (not this branch root or legacy backend); verify all public and private preview routes at actual Pages subpath; compare screenshots to original AI Studio on mobile/desktop; port 2.3.2 functionality into editable React/Next and NestJS with feature parity and security tests; deploy to VPS only after user review. Do not make private repository public or merge main automatically.
