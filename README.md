# MediCompare BD

Mobile-first web store that shows every equivalent medicine brand sold in Bangladesh, **cheapest first**.
Search by brand (e.g. *Napa*) or generic/chemical name (e.g. *Paracetamol*). Every result expands to its full
equivalence group (same generic + strength + dosage form), so a cheaper or in-stock alternative is always visible.

## Quick start

```bash
npm install
npm run db:import      # builds data/medicare.db from data/raw/*.csv (~10 s)
cp .env.example .env.local   # optional: Google sign-in, admin emails
npm run dev            # http://localhost:3000
```

Create an admin (manages orders at `/admin`): set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env.local`, then
`npm run db:admin`. Any email listed in `ADMIN_EMAILS` also gets admin access.

> Stop the dev server before re-running `npm run db:import`. The importer rebuilds catalog tables in place
> (users and orders are kept) and a running server will keep reading stale data until restarted.

## Features

- **Search** (SQLite FTS5, prefix matching) across brand, generic and company names, with typeahead.
- **Equivalence groups**: results grouped by generic + strength + form, ranked by price per unit
  (per tablet, per ml, per gm…), with “Cheapest”, “Save X%” and “Searched” markers and dosage-form filters.
- **Product page**: pack options (single piece / box / bottle sizes), stock status, cheaper-equivalent banner,
  full equivalent list, other strengths/forms, and drug information (indications, dosage, side effects…).
- **Generic and company pages**: company pages show how many products have cheaper equivalents elsewhere.
- **Cart** (stored on the device; prices and stock are re-checked on the server) that suggests a cheaper
  equivalent for each item.
- **Checkout**: guest checkout or create an account inline, sign in with email/password or Google,
  saved addresses, all 64 districts, delivery fee (৳60 in Dhaka, ৳120 outside, free over ৳1,000),
  optional prescription upload, Cash on Delivery (bKash/Nagad/card shown as “coming soon”).
- **Orders**: confirmation page with status timeline, guest order tracking (`/track`, order ID + phone),
  account order history, admin order management (status updates, cancellations restore stock).

## Data

`data/raw/` contains the open-source *Bangladesh medicines* dataset (scraped from MedEx), via
[myselfadib/Bangladesh-Medicines-Dataset-Analysis](https://github.com/myselfadib/Bangladesh-Medicines-Dataset-Analysis):
21,714 brands, 1,711 generics with monographs, and 240 manufacturers.

Things to know before going live:

- **Prices are a snapshot** from when the dataset was scraped and must be refreshed. The authoritative source
  for maximum retail prices is DGDA. The repo has no license file, so confirm you're allowed to use the data
  commercially, or replace it with a licensed or official feed.
- **Stock is demo data.** It's generated deterministically (about 8% of products out of stock) until a real
  pharmacy or distributor inventory feed is connected.
- **48 outlier prices** (less than ¼ or more than 4× their group's median) are flagged “Price unverified” and left
  out of savings claims.
- **Equivalence** is matched on generic name + strength + dosage form. Release types such as Extended or Delayed
  Release are kept separate on purpose. Pages tell users to consult a doctor or pharmacist before switching.
- The dataset doesn't mark which medicines need a prescription, so a prescription upload is optional at checkout.

## Architecture

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4, TypeScript
- SQLite via `better-sqlite3` (`data/medicare.db`): catalog tables plus users, sessions, addresses, orders
- Auth: bcrypt passwords, opaque session tokens (httpOnly cookie), Google OAuth 2.0 code flow (no extra library)
- Key files: `src/lib/catalog.ts` (search and equivalence), `src/lib/orders.ts` (pricing, stock, orders),
  `scripts/import-data.ts` (data pipeline), `src/lib/schema.ts` (schema)

## JSON API (for the Flutter app, phase 2)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/suggest?q=` | Typeahead: brands and generics |
| GET | `/api/v1/search?q=&form=` | Equivalence groups, cheapest first |
| GET | `/api/v1/medicines/:id` | Product, packs, alternatives, drug info |
| GET | `/api/v1/generics/:slug` | All strengths and forms of a generic |
| POST | `/api/v1/cart/quote` | `{items:[{packId,qty}], district}` → server prices, stock, delivery fee, cheaper suggestions |
| GET | `/api/v1/home` | Catalog stats, popular searches, biggest price gaps |
| GET | `/api/v1/meta` | Divisions/districts, payment methods, delivery fees, order statuses |
| GET | `/api/v1/companies`, `/api/v1/companies/:slug?page=` | Companies; a company's products with cheaper-equivalent counts |
| POST | `/api/v1/auth/register` | `{name,email,phone?,password}` → `{token, expiresAt, user}` |
| POST | `/api/v1/auth/login` | `{email,password}` → `{token, expiresAt, user}` |
| POST | `/api/v1/auth/logout` | Revokes the Bearer token (204) |
| GET | `/api/v1/auth/me` | Current user (Bearer) |
| POST | `/api/v1/orders` | Checkout (same validation as the web form) → `{code, total, token?}`; guest, Bearer, or `createAccount` |
| GET | `/api/v1/orders` | Signed-in user's orders (Bearer) |
| GET | `/api/v1/orders/:code` | Order + items for its owner (Bearer) or with `?phone=` matching the order (guest tracking) |
| GET/POST/DELETE | `/api/v1/addresses` (`DELETE ?id=`) | Saved addresses (Bearer) |

The mobile app (`../mobile`) sends the session token as `Authorization: Bearer <token>`; the same `sessions` table
backs the web cookie. Prescription upload is web-only for now. Moving from SQLite to Postgres is straightforward
because all SQL lives in `src/lib`.

## Production TODO

- Payment gateway (SSLCommerz / bKash / Nagad merchant APIs)
- SMS or email order notifications, OTP phone login
- Inventory and price admin (or supplier feed), DGDA price sync
- Bangla UI (i18n)
- Rate limiting on auth endpoints, and object storage for prescriptions
