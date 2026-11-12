import { test, expect } from "@playwright/test";
const product = {
  id: "cloud-crew",
  title: "Cloud Crew",
  description: "Socks",
  category: "Essentials",
  color: "cream",
  priceCents: 1600,
  image: "/products/cloud-crew.svg",
  tags: "socks",
  available: true,
};
function stream() {
  const events: object[] = [
    { type: "start", messageId: "reply" },
    { type: "start-step" },
  ];
  for (const id of ["search-one", "search-two"])
    events.push(
      {
        type: "tool-input-available",
        toolCallId: id,
        toolName: "search_products",
        input: { query: "" },
      },
      {
        type: "tool-output-available",
        toolCallId: id,
        output: { products: [product] },
      },
    );
  events.push(
    { type: "text-start", id: "text" },
    { type: "text-delta", id: "text", delta: "Search complete." },
    { type: "text-end", id: "text" },
    { type: "finish-step" },
    { type: "finish" },
  );
  return (
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/store/books", (r) =>
    r.fulfill({ json: { products: [], hasMore: false } }),
  );
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: stream(),
    }),
  );
});
for (const prompt of [
  "Show me something for fun I can buy under 5 dollars",
  "Show me something for fun I can buy less than $5",
]) {
  test(`hides legacy overpriced tool cards for ${prompt}`, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("What are you looking for?").fill(prompt);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    const reply = page.locator(".chat-message.assistant");
    await expect(reply.getByText("Search complete.")).toBeVisible();
    await expect(reply.locator(".chat-matches button")).toHaveCount(0);
  });
}
test("shows an affordable result once when the model repeats a search", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("What are you looking for?")
    .fill("Show something under $20");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const reply = page.locator(".chat-message.assistant");
  await expect(reply.getByText("Search complete.")).toBeVisible();
  await expect(reply.locator(".chat-matches button")).toHaveCount(1);
  await expect(reply.getByText("Cloud Crew")).toBeVisible();
});

test("a dollar budget includes affordable KES books with a converted estimate", async ({
  page,
}) => {
  const book = {
    variantId: "gid://shopify/ProductVariant/1",
    title: "Fun colouring book",
    variantTitle: "",
    description: "Printable PDF",
    image: null,
    productUrl: "https://pdf-color-games.myshopify.com/products/fun",
    amount: "130.00",
    currency: "KES",
    maxUsdCents: 499,
    usdEstimate: {
      cents: 100,
      kesPerUsd: 130,
      updatedAt: "2026-11-12T00:00:00.000Z",
    },
  };
  const events = [
    { type: "start", messageId: "converted" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "fx",
      toolName: "search_products",
      input: { query: "fun" },
    },
    {
      type: "tool-output-available",
      toolCallId: "fx",
      output: {
        products: [],
        books: [
          book,
          {
            ...book,
            variantId: "gid://shopify/ProductVariant/2",
            title: "Expensive book",
            usdEstimate: { ...book.usdEstimate, cents: 600 },
          },
        ],
      },
    },
    { type: "finish-step" },
    { type: "finish" },
  ];
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body:
        events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
        "data: [DONE]\n\n",
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("What are you looking for?")
    .fill("Show me something fun under $5");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const reply = page.locator(".chat-message.assistant");
  await expect(
    reply.getByRole("button", { name: /Fun colouring book/ }),
  ).toBeVisible();
  await expect(reply.getByText(/≈ \$1.00 USD/)).toBeVisible();
  await expect(reply.getByText("Expensive book")).toHaveCount(0);
  await reply.getByRole("button", { name: /Fun colouring book/ }).click();
  await expect(
    page.getByRole("dialog").getByText(/Estimated at 1 USD = 130.0000 KES/),
  ).toBeVisible();
});

test("retailer cards use external checkout and hide unsafe or over-budget offers", async ({
  page,
}) => {
  const product = {
    id: "retailer-book",
    title: "A real reading book",
    retailer: "books.example",
    url: "https://books.example/buy?id=1",
    priceCents: 425,
    currency: "USD",
  };
  const events = [
    { type: "start", messageId: "market-reply" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "market",
      toolName: "search_market_products",
      input: { query: "reading books" },
    },
    {
      type: "tool-output-available",
      toolCallId: "market",
      output: {
        products: [
          product,
          {
            ...product,
            id: "expensive",
            title: "Too expensive",
            priceCents: 600,
          },
          { ...product, id: "unsafe", url: "javascript:alert(1)" },
        ],
      },
    },
    { type: "finish-step" },
    { type: "finish" },
  ];
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body:
        events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
        "data: [DONE]\n\n",
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("What are you looking for?")
    .fill("Search retailers for reading books under $5");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const cards = page.locator(".market-match");
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAttribute("href", product.url);
  await expect(cards).toHaveAttribute("target", "_blank");
  await expect(cards).toContainText("$4.25");
  await expect(page.locator(".market-note")).toContainText(
    "Checkout is at the retailer",
  );
  await expect(page.locator(".chat-message.assistant .primary")).toHaveCount(0);
});

test("chat survives page navigation and reload with its budget and draft, and can be cleared", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product-grid article")).toHaveCount(12);
  await page.getByLabel("Budget in dollars").fill("20");
  await page
    .getByLabel("What are you looking for?")
    .fill("Show something under $20");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText(
    "Search complete.",
  );
  await page.getByLabel("What are you looking for?").fill("Something in green");
  await page
    .getByRole("link", { name: /Merchant studio/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/");
  await expect(page.locator(".chat-message.user")).toContainText(
    "Show something under $20",
  );
  await expect(
    page.locator(".chat-message.assistant .chat-matches button"),
  ).toHaveCount(1);
  await expect(page.getByLabel("Budget in dollars")).toHaveValue("20");
  await expect(page.getByLabel("What are you looking for?")).toHaveValue(
    "Something in green",
  );
  await page.reload();
  await expect(page.locator(".chat-message.assistant")).toContainText(
    "Search complete.",
  );
  await page.getByRole("button", { name: "Clear chat", exact: true }).click();
  await expect(page.locator(".chat-message")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "What’s on your wishlist?" }),
  ).toBeVisible();
  await expect(page.locator(".chat-message")).toHaveCount(0);
  await expect(page.getByLabel("What are you looking for?")).toHaveValue("");
});

test("unreadable or blocked browser storage does not prevent chatting", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("shopipal.chat.v1", "broken json");
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await expect(page.locator(".product-grid article")).toHaveCount(12);
  await page.getByLabel("What are you looking for?").fill("Socks under $20");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText(
    "Search complete.",
  );
});

test("shows all affordable store matches beyond three and retains them on refresh", async ({
  page,
}) => {
  const books = Array.from({ length: 5 }, (_, i) => ({
    variantId: `gid://shopify/ProductVariant/${i + 1}`,
    title: `Affordable book ${i}`,
    variantTitle: "",
    description: "PDF",
    image: null,
    productUrl: "https://pdf-color-games.myshopify.com/products/book",
    amount: "130.00",
    currency: "KES",
    maxUsdCents: 1999,
    usdEstimate: {
      cents: 100,
      kesPerUsd: 130,
      updatedAt: "2026-11-12T00:00:00.000Z",
    },
  }));
  const products = Array.from({ length: 5 }, (_, i) => ({
    ...product,
    id: `affordable-${i}`,
    title: `Affordable product ${i}`,
    priceCents: 100 + i * 100,
  }));
  const events = [
    { type: "start", messageId: "all-affordable" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "all",
      toolName: "search_products",
      input: { query: "" },
    },
    {
      type: "tool-output-available",
      toolCallId: "all",
      output: {
        products: [
          ...products,
          {
            ...product,
            id: "boundary",
            title: "Exactly twenty dollars",
            priceCents: 2000,
          },
        ],
        books,
      },
    },
    { type: "finish-step" },
    { type: "finish" },
  ];
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body:
        events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
        "data: [DONE]\n\n",
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("What are you looking for?")
    .fill("List all store products below $20");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.locator(".chat-message.assistant .chat-matches button"),
  ).toHaveCount(10);
  await expect(page.locator(".chat-message.assistant")).not.toContainText(
    "Exactly twenty dollars",
  );
  await page.reload();
  await expect(
    page.locator(".chat-message.assistant .chat-matches button"),
  ).toHaveCount(10);
});
