# Jam Roc staff portal

Independent Vite/React application for Jam Roc. Administrators manage food, drinks, images, categories, settings, employees and pickup orders. Employees only see orders and update pickup status. Authorization is enforced in Convex.

## Build

```sh
npm ci
npm run dev
npm run build
```

Set `VITE_CONVEX_URL` to the Jam Roc Convex deployment and `VITE_PUBLIC_SITE_URL` to the public website base URL including its trailing slash. See `.env.example`. No secret belongs in a `VITE_` variable. Missing configuration displays a setup screen rather than an insecure demo login.

Publish `dist/` to this repository's `gh-pages` branch. It contains no backend code or credentials. Root-level Convex source and deployment instructions live in the separate `jamroc` repository.

Username: `jamrocadmin`. The password is provisioned server-side; it is not included in this repository. Create individual employee accounts from the Employees tab.

Images are compressed client-side using the image optimizer adapted from Patio, then validated in Convex. Menu and order edits use optimistic updates with rollback on failure. The staff portal does not create orders or process card payments; Toast handles checkout.
