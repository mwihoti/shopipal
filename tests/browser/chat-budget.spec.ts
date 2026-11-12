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
