# Deploy to Vercel and Turso

## Database

1. Create a **libSQL-compatible** Turso database, not a database using the newer incompatible engine.
2. Obtain its `libsql://...` URL and auth token.
3. In a separate ignored environment file, set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` for that remote database. Run the migration and seed scripts against it using `.env.local`, then restore your local values. Never commit that file.
4. Confirm that the database contains 12 products and the two referral offers. Do not run schema mutations on every incoming request or build.

The scripts load `.env.local`; already-exported environment variables take precedence. Local development uses `file:./data/shopipal.db`. Vercel runtime refuses filesystem database URLs. Builds do not need database connectivity.

## Application

1. Import `mwihoti/shopipal` into Vercel as a Next.js project, root directory `.` and Node 24.x.
2. Configure the following environment variables for the target deployment:

| Variable                       | Value                                                 |
| ------------------------------ | ----------------------------------------------------- |
| `DATABASE_URL`                 | Turso libSQL URL                                      |
| `DATABASE_AUTH_TOKEN`          | Database token                                        |
| `PAYPAL_CLIENT_ID`             | Sandbox merchant app client ID                        |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | The same sandbox client ID                            |
| `PAYPAL_CLIENT_SECRET`         | Sandbox merchant app secret                           |
| `PAYPAL_ENVIRONMENT`           | `SANDBOX`                                             |
| `OPENROUTER_API_KEY`           | OpenRouter key                                        |
| `OPENROUTER_MODEL`             | Exact tool-capable model ID                           |
| `DASHBOARD_PASSPHRASE`         | Long unique demo merchant passphrase                  |
| `SESSION_SECRET`               | Random secret, at least 32 characters                 |
| `SPENDING_CAP_USD`             | `80` or lower                                         |
| `MERCHANT_NAME`                | Demo business display name                            |
| `APP_URL`                      | Canonical application origin, with scheme and no path |

3. Deploy the tested commit. Public client variables are substituted during build, so setting the client ID requires rebuilding.
4. On preview deployments with varying origins, omit `APP_URL` to validate against the actual request origin. With a fixed canonical origin, keep `APP_URL` matching it exactly.
5. Verify `/api/health`, catalog/referral loading, a real personal sandbox buyer payment, and the protected dashboard.
6. Redeploy and confirm completed orders remain visible. If necessary, roll back the app deployment; keep database migrations additive and retain remote payment records.

The default install/build commands are `npm ci` and `npm run build`. Run `npm run test:preview` to verify browsing and disabled transaction controls without a remote database. The CI template at `docs/checks.workflow.yml` runs type checking, lint, domain tests, production build, and Chromium browser tests. To activate it, copy it to `.github/workflows/checks.yml` using a GitHub credential with workflow permission. The connected Git credential used for the initial push did not have that permission. The template does not install cloud credentials or deploy automatically.

## Until credentials are available

A deployment without a usable remote database URL displays a labeled read-only catalog preview. Chat, purchase creation, and merchant reporting require their actual services; there is no fake checkout success fallback. This state is useful for design review but is **not** the completed hackathon payment demo.

The health endpoint verifies presence and database access, not credential validity at external providers. Always perform a real sandbox transaction before calling the hosted payment flow verified.

## Fix “Deployment requires a remote libSQL database”

This means the deployed app has no remote database URL, or has the local development value `file:./data/shopipal.db`. The local `.env.local` file is ignored by Git and does not configure Vercel.

1. In the Vercel **shopipal** project, open **Settings → Environment Variables**.
2. Set `DATABASE_URL` to your database's `libsql://...` endpoint and `DATABASE_AUTH_TOKEN` to its token. Choose Production, and Preview if you also deploy preview branches. `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are supported aliases. Secure `https://` and `wss://` libSQL endpoints are also supported.
3. Put those same two values in your local ignored `.env.local` temporarily. From the repository root, initialize the remote database:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

4. Redeploy in Vercel so the new environment variables take effect. Restore your local database values afterward if desired.
5. Configure the remaining application variables above before testing chat or payment. Check `/api/health`; `ready` means the configuration checks and database query passed.

Without a remote database URL, the hosted collection stays in preview and disables chat and purchase controls. Category filters still work. A configured remote endpoint that cannot connect reports an error; the app does not replace failed database reads with preview data.

## Connected Shopify book store

The book shelf and assistant connect to `pdf-color-games.myshopify.com` through the tokenless Storefront API, pinned to `2026-10`. No Admin API token is shipped to the browser or needed in Vercel. Products must be published to the Online Store and available for sale. The app fetches up to 30 products and 10 variants per product; the store link provides access to the full catalog.

Book prices use KES. The demo's USD budget and referral commissions apply only to sandbox products; the assistant accepts a separate explicit KES budget for books. The book review requires approval before creating a one-item Shopify cart, rechecks price and availability, and verifies the returned variant and checkout host. Creating a cart is not a payment.

Shopify controls the final total, payment methods, payment/test mode, order creation, and digital fulfillment. Review the store's payment settings before purchasing. Shopify purchases do not appear in the sandbox dashboard and do not accrue its demo referral commissions. Digital files must be attached and delivery configured in the Shopify store. The current catalog contains printable colouring/activity books; publish reading books there to make those discoverable as well.

References: [Tokenless Storefront API](https://shopify.dev/docs/api/storefront/2026-10), [Cart creation and checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
