# PayPal AI Hackathon submission

Official deadline: **12 November 2026, 12:00 PST / 23:00 EAT (Nairobi)**. Submit before the deadline; saving a draft is not a completed entry. Keep the demo available without a charge for judges through the end of judging on **15 December 2026**. Check the [official rules](https://paypalaihackathon.devpost.com/rules) for eligibility and any organizer updates.

## Submit on Devpost

1. Sign in at the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/), join the event if needed, then open **Enter a submission** or your existing project draft.
2. Use **Shopipal** as the project name. Add the English description below, adapting the challenges and accomplishments to your actual experience. Explain which work was built or significantly updated during the hackathon.
3. Add **https://shopipal.vercel.app** as the working demo and **https://github.com/mwihoti/shopipal** as the public source repository. Confirm that GitHub recognizes the existing MIT `LICENSE` file.
4. Record the working app and upload a **public YouTube video shorter than three minutes**. Paste its URL into the video field. Use English narration or provide an English translation. Do not show API keys, environment values, account passwords, or private dashboard information while recording.
5. Add testing instructions using the section below. Supply a dedicated **Personal PayPal sandbox buyer email and password**, plus the merchant studio demo passphrase, in the submission's testing instructions. Check whether that field is public before adding any login, and use dedicated test accounts only. Never include service API keys or a real PayPal login. The hosted app already has its server configuration.
6. For sponsor selections offered by the form, describe the actual **Channel3 API** product search and **AG Grid Community** merchant table. Demonstrate a real successful Channel3 search before claiming that integration works. Review the [Channel3 sponsor requirements](https://paypalaihackathon.devpost.com/details/channel3); referencing the sponsor alone is insufficient. Sponsor eligibility is decided by the organizers.
7. Complete the remaining required fields, team information and declarations. Preview every link in a signed-out browser, then press the final **Submit** action. Reopen the event dashboard and verify that the project is submitted, not merely saved as a draft.

## Copy-ready project description

### Inspiration

Shopping often begins with a small request: a book, a useful gift, or something under a fixed budget. Shopipal turns that request into a short set of choices while keeping purchase approval with the shopper.

### What it does

Shopipal searches a sandbox product collection, a connected Shopify book store, and external retailer listings through Channel3. It respects amounts typed in chat and compares Kenyan shilling book prices against dollar budgets using a current daily exchange rate. Retailer results include product images, offer prices and links to the retailer's checkout.

For the PayPal demo collection, the assistant prepares a server-priced quote. The shopper reviews the item and explicitly approves it before completing a PayPal sandbox payment. Creator referrals are recorded after a completed capture, and a merchant dashboard built with AG Grid shows orders, captured volume and commission owed.

Shopify books offer a choice of Shopify checkout for store fulfillment or PayPal sandbox for a USD test payment. The test payment does not create a Shopify order or deliver a PDF. External Channel3 listings are purchased at the retailer; they are never charged through Shopipal's sandbox merchant.

### How it is built

The application uses Next.js, TypeScript, React, the Vercel AI SDK with an OpenRouter model, PayPal Orders v2 and the PayPal browser SDK, Turso/libSQL with Drizzle, Shopify's Storefront API, Channel3's authenticated product search API, ExchangeRate-API and AG Grid Community. It runs on Vercel. The source repository includes setup instructions and an MIT license.

The model has search and quote-preparation tools. Approval, order creation and capture remain controlled by the application and shopper. Server-side checks enforce budgets, ownership, price consistency and quote expiry, with idempotency and capture recovery to reduce duplicate-payment risk.

### Current boundaries

Direct PayPal payments are sandbox-only. Physical collection items are samples with licensed reference photographs. Shopify controls its own payment and download fulfillment. External retailers control final prices, taxes, shipping availability, payment and fulfillment. Creator commission tracking is prototype accounting, without automated payouts.

## Testing instructions to adapt

- Demo: https://shopipal.vercel.app/?ref=alice
- Source and setup: https://github.com/mwihoti/shopipal
- Ask **“Show me something fun under $5”**. KES 130 books should qualify when the current exchange rate permits; the $16 sample socks should not appear as affordable matches.
- Ask **“Search retailers for reading books under $10”**. Verify Channel3 cards show retailer names, prices within the limit, images when available and external links. Opening a link does not approve or capture a Shopipal payment. Shipping to Kenya is not guaranteed.
- Ask **“Find socks under $20”**, review Cloud Crew at $16, approve the purchase and pay using the dedicated Personal sandbox buyer account supplied separately. Confirm the receipt.
- Visit https://shopipal.vercel.app/dashboard with the supplied demo passphrase. Confirm the completed order and Alice's $2.40 commission owed. Existing totals include earlier tests.
- Review a Shopify book and inspect the two checkout choices. Shopify may charge real money; no real purchase is required to judge the sandbox flow.

Before submitting, replace any missing test access in your Devpost entry with a working dedicated buyer login and merchant passphrase. This repository deliberately contains no shared buyer credentials or service secrets.

## Video outline: approximately 2 minutes 40 seconds

| Time      | Show and explain                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Introduce the budget-aware shopping problem and Shopipal.                                                                                                                   |
| 0:15–0:40 | Ask for something fun under $5; show a qualifying KES book and its USD estimate.                                                                                            |
| 0:40–1:05 | Ask for retailer reading books under $10; show a real Channel3 result, its image, retailer and external checkout link.                                                      |
| 1:05–2:00 | Choose the $16 socks through Alice's referral, review, approve and complete a PayPal sandbox payment. Cut loading time while retaining the approval and successful receipt. |
| 2:00–2:25 | Show the new completed order and $2.40 commission in the AG Grid merchant studio.                                                                                           |
| 2:25–2:40 | Show the public repository and briefly explain the human approval boundary and sandbox versus retailer checkouts.                                                           |

## Final checklist

- [ ] Channel3 production key is configured and a real search succeeds on the hosted app.
- [ ] A dedicated Personal sandbox buyer login works; judging instructions contain test access.
- [ ] A public YouTube demo under three minutes is attached.
- [ ] Demo and public source links work when signed out; MIT license is visible.
- [ ] Description accurately reflects demonstrated behavior and current limitations.
- [ ] Devpost confirms final submission before the deadline.
