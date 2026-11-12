# Shopipal

**A little help. A great find.** Shopipal is a shopping assistant that searches products, explains its choices, and prepares a purchase for the shopper to review. The shopper approves the choice and completes payment; the assistant cannot approve or pay on their behalf.

**[Try the live app](https://shopipal.vercel.app)** · **[Merchant studio](https://shopipal.vercel.app/dashboard)** · **[Connected book store](https://pdf-color-games.myshopify.com/)** · **[MIT license](LICENSE)**

Built for the PayPal AI Hackathon. The app has two shopping flows:

| Flow               | Catalog and currency                                | Checkout                                                     | Where orders appear                                           |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| PayPal demo        | 12 sample products in USD; maximum $80 per purchase | PayPal **sandbox**, using a personal sandbox buyer           | Shopipal merchant studio, including referral commissions      |
| Shopify book store | Published books from pdf-color game, priced in KES  | The store's **Shopify checkout**, using its payment settings | Shopify order admin; digital delivery is managed by the store |

The Shopify store is separate from the PayPal sandbox demo. Its checkout may charge real money. Review the final total and payment method there before paying. Chat uses the USD budget ceiling and exchange-rate estimates to compare items across both catalogs. Shopify still controls the final payable total and payment settings; demo referral commissions do not apply to its purchases.

## What works

- Conversational discovery through OpenRouter and the Vercel AI SDK, with server-side catalog tools and a five-step execution limit.
- Twelve illustrated demo products, category filters, and a shopper-controlled USD budget. Explicit price limits such as “under 5 dollars” or “less than $5” also constrain chat results and review quotes; follow-up messages keep the last stated limit until it is changed. KES book prices are converted to estimated USD when checking a dollar budget; an explicit KES limit is also respected.
- Server-priced quotes, explicit purchase approval, and PayPal Orders v2 checkout.
- Session ownership, quote expiry, merchant and amount verification, idempotent requests, and interrupted-capture recovery.
- `?ref=alice` (15%) and `?ref=bob` (10%) attribution, recorded only after a completed sandbox capture.
- A passphrase-protected AG Grid merchant studio showing payment status, captured volume, and commission owed.
- Live Shopify book discovery, KES budget filtering through the assistant, a book review screen, and approved handoff to a one-item Shopify cart.
- Local SQLite and hosted Turso libSQL using the same migrations.

The connected store currently sells printable colouring/activity books. Publish reading books to the store's Online Store channel to make them discoverable too. No reading titles or download files are invented by the assistant.

## For judges: try the PayPal sandbox demo

The hosted app is already configured. You do not need developer API keys to try it.

### Sandbox buyer login

Use a dedicated **Personal / Buyer sandbox account**, separate from the Business / Merchant account associated with the app. This login belongs in the PayPal popup, not the merchant studio.

| Login field            | Dedicated judging account                                             |
| ---------------------- | --------------------------------------------------------------------- |
| Sandbox buyer email    | **Pending: owner must provide the dedicated Personal sandbox email.** |
| Sandbox buyer password | **Pending: owner must provide that account's sandbox password.**      |

These entries are intentionally marked pending until the account owner supplies the actual test login. They are not working credentials. A PayPal app Client ID and Secret cannot be used as a buyer login.

To create or retrieve the buyer login:

1. Sign in to [PayPal Developer → Sandbox Accounts](https://developer.paypal.com/dashboard/accounts).
2. Under **Testing Tools → Sandbox Accounts**, select an existing **Personal** account or choose **Create Account → Personal (Buyer)** and select a country/region.
3. Open the account's menu and choose **View/Edit account**. Find its sandbox email and generated password under **Login Info**. If necessary, set a new sandbox password and save it.
4. Give judges only this dedicated test buyer's email and password. PayPal generates sandbox accounts for testing; transactions between these accounts do not move real money. See [PayPal's sandbox account guide](https://developer.paypal.com/sandbox-testing/accounts).

### Complete a sandbox purchase

1. Open **[Shopipal with Alice's referral](https://shopipal.vercel.app/?ref=alice)**. Confirm the referral banner identifies Alice.
2. Ask **“Find socks under $20”**, or browse the sandbox collection below the book store. Choose **Cloud Crew — $16.00**.
3. Review the item, merchant, USD price, spending cap, referral, and **$2.40** creator commission. The commission is included in the demo price; it is not an additional charge.
4. Click **I approve this purchase**, then the **PayPal** button.
5. In the PayPal sandbox popup, log in with the **Personal sandbox buyer email and password above**. Review the amount and complete the sandbox payment. Do not use your real PayPal account or the Business sandbox seller login.
6. Confirm the receipt says the payment completed and displays the PayPal order and capture IDs.
7. Open **[Merchant studio](https://shopipal.vercel.app/dashboard)** and sign in with the demo merchant passphrase provided in the submission's testing instructions. Verify the new **$16.00** completed order and **$2.40 commission owed** for Alice. Summary totals include earlier test purchases.
8. If the connection drops after approval, use **Check payment status** before retrying. The server reconciles completed captures without charging again.

A completed $16.00 sandbox purchase with Alice's $2.40 commission has been demonstrated in the deployed merchant studio. Each judge should still verify their own checkout and receipt. Commission is prototype accounting; no creator payout is sent.

## Try book discovery and Shopify checkout

1. Open the [live app](https://shopipal.vercel.app) and select **Book store**, or scroll to the book collection.
2. Ask **“Find a printable colouring book under 150 KES.”** You can also ask **“Show me something fun under $5”**. The assistant checks both catalogs and converts KES book prices to estimated USD.
3. Select a returned book and review its title, variant, price, description, and store listing.
4. Click **I approve · Continue to Shopify** to create a one-item cart and open the store's checkout. Prices and availability are checked again before handoff.
5. Review Shopify's final total and available payment methods before deciding whether to pay. Your PayPal demo sandbox buyer login is not a general Shopify login, and the store does not inherit Shopipal's sandbox payment configuration.

The live catalog, assistant search, mobile layout, and Shopify checkout handoff have been checked. A completed Shopify purchase and digital-file delivery have **not** been verified. Shopify purchases do not appear in the Shopipal sandbox dashboard.

## Run locally

Use Node **24 LTS** and npm. The app has also been checked with Node 26.

```bash
git clone https://github.com/mwihoti/shopipal.git
cd shopipal
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Local catalog browsing and purchase-review cards work after database setup. Chat and PayPal checkout require the environment variables below. Seeding is repeatable and does not overwrite existing products or orders.

### Configuration

Set these in the ignored `.env.local` file for development, or in Vercel's environment settings for a deployment:

| Variable                       | Purpose                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`                 | Local `file:./data/shopipal.db`; hosted deployments require a remote libSQL endpoint |
| `DATABASE_AUTH_TOKEN`          | Token for the remote database; not needed for local SQLite                           |
| `PAYPAL_CLIENT_ID`             | Sandbox merchant REST app Client ID                                                  |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | The same sandbox Client ID, used by the browser SDK                                  |
| `PAYPAL_CLIENT_SECRET`         | Sandbox app secret; server only                                                      |
| `PAYPAL_ENVIRONMENT`           | `SANDBOX`; the app rejects live mode                                                 |
| `OPENROUTER_API_KEY`           | Server-side OpenRouter API key                                                       |
| `OPENROUTER_MODEL`             | Exact model ID supporting tool calling                                               |
| `DASHBOARD_PASSPHRASE`         | Merchant studio sign-in passphrase                                                   |
| `SESSION_SECRET`               | Random signing secret of at least 32 characters                                      |
| `SPENDING_CAP_USD`             | Maximum sandbox purchase amount; `80` or lower                                       |
| `MERCHANT_NAME`                | Sandbox merchant display name                                                        |
| `APP_URL`                      | Canonical app origin, such as `http://localhost:3000`                                |

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are supported database aliases. After changing a `NEXT_PUBLIC_` variable, restart the dev server or rebuild the deployment.

### PayPal application setup

1. In [PayPal Apps & Credentials](https://developer.paypal.com/dashboard/applications/sandbox), create a **sandbox** merchant REST app associated with a **Business** sandbox seller account.
2. Set both Client ID variables to that app's Client ID and set the server secret in `PAYPAL_CLIENT_SECRET`.
3. Keep `PAYPAL_ENVIRONMENT=SANDBOX`.
4. Create the separate **Personal** buyer account using the steps above. Its email/password are used only during checkout, not as server environment variables.

### OpenRouter and agent tools

Create a key at [OpenRouter](https://openrouter.ai/settings/keys) and choose a [tool-capable model](https://openrouter.ai/models). The app uses `@openrouter/ai-sdk-provider`, `ai`, and `@ai-sdk/react`; it does not need a separate OpenAI key or Vercel AI Gateway.

The model can call `search_products`, `get_product`, and `prepare_checkout` for the sandbox collection, and `search_store_books` and `prepare_store_checkout` for the book store. These tools search or prepare reviews. They do not approve, capture, refund, or pay creators. The Shopify cart is created only after the shopper approves the review in the UI.

### Merchant studio

Set a merchant passphrase and generate a signing secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the result in `SESSION_SECRET`, then visit `/dashboard` to sign in. Sessions expire after one hour. The studio shows up to the latest 500 sandbox orders without payer email or addresses.

### Shopify connection

The store integration uses tokenless Storefront API access, pinned to `2026-10`. No Shopify Admin API token is needed in Vercel or shipped to the browser. It reads up to 30 published products and 10 variants per product. The store link provides access to the full catalog.

Currency comparisons use the daily USD/KES feed from [ExchangeRate-API](https://www.exchangerate-api.com/docs/free), cached for one hour. Rates older than 48 hours are rejected. USD estimates round upward to the nearest cent for budget checks; the rate and update date appear on a book review. If rates are unavailable, the assistant reports that it cannot verify dollar affordability rather than assuming no affordable books exist. Conversion is checked again before a budgeted Shopify cart is created. Final checkout exchange rates, taxes, and payment fees can differ.

Shopify handles its checkout, payment methods, final taxes/total, order creation, and digital fulfillment. Book download files and delivery must be configured in Shopify. See [Shopify cart and checkout documentation](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).

## Hosted setup

See [deployment instructions](docs/deployment.md) for Vercel and Turso. A deployment without a usable remote database displays a labeled sandbox catalog preview with chat and sandbox purchase controls disabled. It does not simulate successful payment.

`GET /api/health` returns `ready` when required configuration and database access are available. It does not perform a model request, PayPal transaction, or Shopify purchase.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:preview
```

The checks cover chat price limits and repeated result cards, in addition to catalog discovery, purchase reviews, and checkout. Run the commands above to verify the current revision. The separate preview suite checks browsing with unavailable sandbox transaction controls.

Browser tests use an isolated SQLite file and port 3107. PayPal browser tests intercept SDK/payment responses; server tests exercise payment state transitions with a mocked PayPal transport. Shopify tests cover currency separation, changed prices, unavailable variants, cart contents, checkout hosts, and explicit approval before handoff. These checks do not replace a completed sandbox payment or a real Shopify purchase.

## Architecture and boundaries

See [architecture](docs/architecture.md) and [demo checklist](docs/demo.md). The sandbox demo supports one item per order, USD pricing, no delivery or tax charges, and a maximum $80 purchase. Creator payouts, AG Studio, live PayPal processing in Shopipal, multi-merchant sandbox checkout, and physical inventory fulfillment are not implemented. Shopify checkout and fulfillment remain owned by the connected store.

Application code, original sample-product illustrations, and documentation were created for this hackathon build. PayPal provides sandbox order creation, buyer approval, and capture; OpenRouter provides the language model; AG Grid Community provides the merchant order table; Shopify provides the connected book catalog and store checkout. Service API keys, client secrets, database tokens, and session secrets are not published in this repository.

## License

This project's source code, original sample-product illustrations, and documentation are publicly available under the **[MIT License](LICENSE)**, copyright © 2026 Daniel Mwihoti. You may use, modify, and redistribute them subject to that license. Third-party packages retain their respective licenses. Books, cover images, and downloadable files offered by the connected Shopify store are separate store content and are not licensed for redistribution by this repository.
