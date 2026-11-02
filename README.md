# Youth portal update

Run `npm install` and then `npm start`. Set `MONGO_URI` in the deployment environment to persist records; without it, data only lasts until the server restarts.

Open `/secret-admin-portal-kasaini-2026` for administration and `/dashboard` for the member dashboard. The supplied app also expects the existing `index.html`, `login.html`, `jumuiya-portal.html`, `app-shell.css`, `i18n.js`, and `theme.js` files in `public/`.

The Youth Contributions / Pledges register is independent of membership registration. Select **Youth pledge** when recording a payment through the Jumuiya portal: a payment with a matching name immediately credits that person's redeemed balance. The admin can still correct a pledge amount manually.
