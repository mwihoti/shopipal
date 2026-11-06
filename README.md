# Shopipal

**A little help. A great find.** Shopipal is a shopping assistant that searches a small catalog, explains its choices, and prepares a purchase for the shopper to review. Only the shopper can approve a purchase and complete PayPal checkout.

Built for the PayPal AI Hackathon. All payments use **PayPal sandbox**. This is a single-merchant prototype with one item per order, USD pricing, no delivery or tax charges, and an $80 maximum per purchase.

## What works

- Conversational discovery through OpenRouter and the Vercel AI SDK, with catalog tools and a five-step execution limit.
- Twelve illustrated products, category filters, and an explicit shopper-controlled budget.
- Server-priced quotes, a separate purchase approval card, and PayPal Orders v2 checkout.
- Session ownership, quote expiry, merchant and amount verification, idempotent requests, and recovery after interrupted captures.
- `?ref=alice` and `?ref=bob` attribution with commission recorded only after completed capture.
- A passphrase-protected AG Grid merchant studio with payment status and commission totals.
- Local SQLite and hosted Turso libSQL using the same migrations.

## Run locally

Use Node **24 LTS** and npm. The current environment was also checked with Node 26.

```bash
git clone https://github.com/mwihoti/shopipal.git
cd shopipal
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The catalog and purchase-review cards work with the local database before you add payment or model credentials. Chat and checkout show setup errors until their credentials are configured. Seeding is repeatable and does not overwrite existing products or orders.

### OpenRouter

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env.local`. Use an exact OpenRouter model ID that supports tool calling. The app uses `@openrouter/ai-sdk-provider`, `ai`, and `@ai-sdk/react`. It does not require a separate OpenAI key or Vercel AI Gateway.

The model can call only `search_products`, `get_product`, and `prepare_checkout`. The last tool creates a local quote, not a PayPal order or a charge. Shopper messages, generated recommendations, and tool arguments never supply an authoritative amount.

### PayPal sandbox

1. Open the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and create a **sandbox** merchant REST application associated with a business sandbox account.
2. Copy its client ID into both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Put the secret in `PAYPAL_CLIENT_SECRET`.
3. Keep `PAYPAL_ENVIRONMENT=SANDBOX`. Live mode is rejected.
4. Under Testing Tools → Sandbox Accounts, create or select a **personal sandbox buyer**, separate from the business seller.
5. Use that buyer's sandbox email and password in the PayPal popup. Use sandbox accounts only, not your real PayPal account.

After modifying a `NEXT_PUBLIC_` variable, restart the dev server or rebuild the deployment. Public client IDs are intentional; client secrets remain server-only.

### Merchant studio

Set `DASHBOARD_PASSPHRASE` to a long unique demo passphrase and `SESSION_SECRET` to a random secret of at least 32 characters. Visit `/dashboard` and sign in. Sessions expire after one hour. The studio displays up to the latest 500 orders, without payer email or addresses.

Example secret generation (run locally and put the result in your environment):

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Demo walkthrough

1. Open `http://localhost:3000/?ref=alice`.
2. Ask: **Find a running shoe under $80**. Set a smaller budget with the budget control if desired; chat cannot increase it.
3. Choose **Trail Runner — $74** and review the item, merchant, USD total, cap, and referral commission.
4. Click **I approve this purchase**, then the PayPal button. Log in as the personal sandbox buyer and approve.
5. Confirm the receipt shows a completed capture with PayPal order and capture IDs.
6. Open the merchant studio and verify the $74 order and Alice's **$11.10 commission owed**.
7. If a connection fails after approval, use **Check payment status** before retrying. The server reconciles completed captures without charging again.

## Hosted setup

See [deployment instructions](docs/deployment.md) for Vercel and Turso. With no remote database configured, the hosted app deliberately offers a read-only catalog preview and marks that limitation. It does not simulate a successful payment.

`GET /api/health` returns `ready` only when required configuration and database access are available. It does not perform a live model or PayPal call, and is not proof of a successful payment.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests use an isolated SQLite file and port 3107. The payment browser scenario intercepts PayPal SDK and payment responses; domain tests separately exercise the real server payment state machine with a mocked PayPal transport. These checks **do not replace a real sandbox transaction**. Production dependencies are checked with `npm audit --omit=dev`.

## Architecture and boundaries

See [architecture](docs/architecture.md) and [demo checklist](docs/demo.md). Optional Shopify catalog integration, creator payouts, AG Studio, production payments, shipping, multi-merchant support, and inventory fulfillment are not implemented. Commissions represent prototype accounting only.

All application code, original product illustrations, and this documentation were created for this hackathon build. PayPal provides order creation, buyer approval, and capture; OpenRouter provides the language model; AG Grid Community provides the merchant order table. The source is licensed under [MIT](LICENSE).

For judging, supply the hosted URL, a dedicated sandbox buyer login, and the demo merchant passphrase through the submission's testing instructions. No usable service keys or test-account passwords are committed in this repository.
