# ARASH Fitness — Static Demo

This directory contains an isolated, frontend-only demonstration of the customer/athlete and administrator experiences.

## Open

Serve the `public_html` directory with any static HTTP server and open:

`/demo/`

No PHP, Laravel, Composer, database, API, SMS provider, payment gateway, or server-side session is required.

## Demo paths

- Select **پنل مدیریت باشگاه** to explore the admin experience.
- Select **پنل ورزشکار** to explore the athlete experience.

## Included interactions

- Admin dashboard, athlete directory, coaches, membership plans, training programs, appointments, finance summary, and settings.
- Athlete dashboard, profile editing, training plan, progress update, appointment request, coach message, and membership card.
- Add/remove sample athletes and add sample list items.
- Demo changes persist in browser LocalStorage.
- User-entered display values are HTML-escaped before rendering.
- Responsive RTL layout for desktop and mobile.

All data and actions are fictional simulations. No real account, booking, message, payment, membership, or financial transaction is created.

## QA performed

- JavaScript syntax validation with Node.js.
- Headless Chromium interaction checks across all admin and athlete navigation routes.
- Add-athlete, profile-save, appointment-request, message, and generic-item interactions.
- LocalStorage reload persistence.
- HTML-injection regression check for user-entered member names.
- Mobile viewport check at 390px with no horizontal page overflow.
- No uncaught page errors during the automated interaction suite.

## Reset demo data

Clear LocalStorage for the demo origin, or use browser site settings to clear this site's stored data.

## Important

This is a sales/demo prototype, not a production system. Never enter real customer data or payment details.
