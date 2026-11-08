import { test, expect } from "@playwright/test";

test("unconfigured hosted preview allows browsing without database actions", async ({
  page,
}) => {
  const databaseRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(chat|quotes|referral|orders)/.test(request.url()))
      databaseRequests.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem("shopipal.pending", "old-checkout"),
  );
  await page.goto("/?ref=alice");
  await expect(
    page.getByText("Preview mode ·", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".product-grid article")).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: "Review Trail Runner", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Running shoes under $80" }),
  ).toBeDisabled();
  await expect(page.getByLabel("What are you looking for?")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Check payment status/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Carry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daybreak Pack" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Trail Runner", exact: true }),
  ).toHaveCount(0);
  expect(databaseRequests).toEqual([]);
  await expect(page.locator(".notice.error")).toHaveCount(0);
});
