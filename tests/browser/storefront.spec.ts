import { test, expect } from "@playwright/test";
test("catalog filters, referral attribution, review approval, and keyboard dismissal", async ({
  page,
}) => {
  await page.goto("/?ref=alice");
  await expect(
    page.getByRole("heading", { name: "A little help. A great find." }),
  ).toBeVisible();
  await expect(
    page.getByText("You're shopping with Alice's referral."),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("storefront-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Carry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daybreak Pack" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Trail Runner", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Footwear", exact: true }).click();
  const [quoteResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/quotes")),
    page
      .getByRole("button", { name: "Review Trail Runner", exact: true })
      .click(),
  ]);
  expect(quoteResponse.status()).toBe(200);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("$74.00", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "I approve this purchase" }),
  ).toBeVisible();
  await expect(page.getByText("Review approved.")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("rejects products exceeding the shopper budget", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Budget in dollars").fill("60");
  await page
    .getByRole("button", { name: "Review Trail Runner", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "exceeds your budget" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("mobile collection fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Meet your next favorite." }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("storefront-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("sandbox approval callback renders the mocked receipt and order dashboard", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.request.get("/dashboard");
  await page.route("https://www.paypal.com/sdk/js?**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.paypal={Buttons(options){return {async render(element){const button=document.createElement('button');button.textContent='Test PayPal approval';button.onclick=async()=>{await options.createOrder();await options.onApprove({orderID:'TEST-PP'},{restart:async()=>{}});};element.appendChild(button);},async close(){}}}};`,
    }),
  );
  let quoteId = "";
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/quotes") && response.ok())
      quoteId = (await response.json()).id;
  });
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      json: { orderId: "test-order", paypalOrderId: "TEST-PP" },
    }),
  );
  await page.route("**/api/orders/test-order/capture", (route) =>
    route.fulfill({
      json: {
        id: "test-order",
        status: "COMPLETED",
        paypalOrderId: "TEST-PP",
        captureId: "TEST-CAPTURE",
        commissionCents: 1110,
        quote: {
          id: quoteId,
          title: "Trail Runner",
          amountCents: 7400,
          referralCode: "alice",
        },
      },
    }),
  );
  await page.goto("/?ref=alice");
  await expect(
    page.getByText("You're shopping with Alice's referral."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review Trail Runner", exact: true })
    .click();
  await page.getByRole("button", { name: "I approve this purchase" }).click();
  await page.getByRole("button", { name: "Test PayPal approval" }).click();
  await expect(
    page.getByRole("heading", { name: "Good choice." }),
  ).toBeVisible();
  await expect(page.getByText("TEST-CAPTURE", { exact: true })).toBeVisible();
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({
      json: {
        orders: [
          {
            id: "test-order",
            title: "Trail Runner",
            status: "COMPLETED",
            amount_cents: 7400,
            commission_cents: 1110,
            referral_code: "alice",
            paypal_capture_id: "TEST-CAPTURE",
            paypal_order_id: "TEST-PP",
            created_at: Date.now(),
          },
        ],
      },
    }),
  );
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/dashboard"),
    ),
    page.getByRole("link", { name: "View merchant dashboard" }).click(),
  ]);
  await expect(
    page.getByText("Captured volume", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(
    page.getByRole("gridcell").filter({ hasText: "TEST-CAPTURE" }),
  ).toBeVisible();
});
test("dashboard requires merchant login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "For the merchant." }),
  ).toBeVisible();
  await page.getByLabel("Merchant passphrase").fill("browser-test-passphrase");
  await page.getByRole("button", { name: "Open merchant studio" }).click();
  await expect(
    page.getByRole("heading", { name: "Order activity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Merchant passphrase")).toBeVisible();
});
