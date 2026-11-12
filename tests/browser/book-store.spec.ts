import { test, expect } from "@playwright/test";
const book = {
  variantId: "gid://shopify/ProductVariant/123",
  title: "A printable activity book",
  variantTitle: "",
  description: "A downloadable colouring PDF.",
  image: null,
  productUrl: "https://pdf-color-games.myshopify.com/products/activity-book",
  amount: "130.0",
  currency: "KES",
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/store/books", (route) =>
    route.fulfill({ json: { products: [book], hasMore: false } }),
  );
});
test("book purchase requires review and explicit Shopify handoff", async ({
  page,
}) => {
  let checkoutRequests = 0;
  await page.route("**/api/store/checkout", async (route) => {
    checkoutRequests++;
    expect(route.request().postDataJSON()).toEqual({
      variantId: book.variantId,
      expectedAmount: "130.0",
      currency: "KES",
      approved: true,
    });
    await route.fulfill({
      json: {
        checkoutUrl: "https://pdf-color-games.myshopify.com/checkouts/test",
      },
    });
  });
  await page.route(
    "https://pdf-color-games.myshopify.com/checkouts/test",
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Store checkout</h1>",
      }),
  );
  await page.goto("/");
  const shelf = page.getByRole("region", { name: "Book store" });
  await expect(shelf.getByRole("heading", { name: book.title })).toBeVisible();
  await shelf
    .getByRole("button", { name: `Review book ${book.title}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/may charge real money/)).toBeVisible();
  await expect(dialog.getByText(/KES/)).toBeVisible();
  expect(checkoutRequests).toBe(0);
  await dialog
    .getByRole("button", { name: "I approve · Continue to Shopify" })
    .click();
  await expect(page).toHaveURL(
    "https://pdf-color-games.myshopify.com/checkouts/test",
  );
  expect(checkoutRequests).toBe(1);
});
test("book shelf stays readable when the store is down", async ({ page }) => {
  await page.route("**/api/store/books", (route) =>
    route.fulfill({ status: 502, json: { error: "Unavailable" } }),
  );
  await page.goto("/");
  const shelf = page.getByRole("region", { name: "Book store" });
  await expect(shelf.getByText(/temporarily unavailable/)).toBeVisible();
  await expect(
    shelf.getByRole("link", { name: "Visit the store" }),
  ).toHaveAttribute("href", "https://pdf-color-games.myshopify.com");
});
