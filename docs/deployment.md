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

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Turso libSQL URL |
| `DATABASE_AUTH_TOKEN` | Database token |
| `PAYPAL_CLIENT_ID` | Sandbox merchant app client ID |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | The same sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | Sandbox merchant app secret |
| `PAYPAL_ENVIRONMENT` | `SANDBOX` |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `OPENROUTER_MODEL` | Exact tool-capable model ID |
| `DASHBOARD_PASSPHRASE` | Long unique demo merchant passphrase |
| `SESSION_SECRET` | Random secret, at least 32 characters |
| `SPENDING_CAP_USD` | `80` or lower |
| `MERCHANT_NAME` | Demo business display name |
| `APP_URL` | Canonical application origin, with scheme and no path |

3. Deploy the tested commit. Public client variables are substituted during build, so setting the client ID requires rebuilding.
4. On preview deployments with varying origins, omit `APP_URL` to validate against the actual request origin. With a fixed canonical origin, keep `APP_URL` matching it exactly.
5. Verify `/api/health`, catalog/referral loading, a real personal sandbox buyer payment, and the protected dashboard.
6. Redeploy and confirm completed orders remain visible. If necessary, roll back the app deployment; keep database migrations additive and retain remote payment records.

The default install/build commands are `npm ci` and `npm run build`. GitHub Actions runs type checking, lint, domain tests, production build, and Chromium browser tests before release. It does not install cloud credentials or deploy automatically.

## Until credentials are available

A deployment without `DATABASE_URL` displays a labeled read-only catalog preview. Chat, purchase creation, and merchant reporting require their actual services; there is no fake checkout success fallback. This state is useful for design review but is **not** the completed hackathon payment demo.

The health endpoint verifies presence and database access, not credential validity at external providers. Always perform a real sandbox transaction before calling the hosted payment flow verified.
