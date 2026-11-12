import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/exchange-rate", async (original) => ({
  ...(await original<typeof import("../src/lib/exchange-rate")>()),
  usdKesRate: vi.fn(async () => ({
    kesPerUsd: 130,
    updatedAt: "2026-11-12T00:00:00.000Z",
  })),
}));
vi.mock("../src/lib/catalog", () => ({
  searchProducts: vi.fn(async (_query: string, max: number) =>
    [{ id: "socks", available: true, priceCents: 1600 }].filter(
      (p) => p.priceCents <= max,
    ),
  ),
  getProduct: vi.fn(async () => ({
    id: "socks",
    available: true,
    priceCents: 1600,
  })),
}));
vi.mock("../src/lib/quotes", () => ({
  prepareQuote: vi.fn(async (_sid: string, _id: string, max: number) => {
    if (max < 1600) throw new Error("exceeds budget");
    return { amountCents: 1600, budgetCents: max };
  }),
}));
vi.mock("../src/lib/shopify", () => ({
  searchStoreBooks: vi.fn(async (_query: string, max?: number) => ({
    products:
      max !== undefined && max < 130
        ? []
        : [
            {
              variantId: "gid://shopify/ProductVariant/1",
              amount: "130.00",
              currency: "KES",
            },
          ],
  })),
  getStoreBook: vi.fn(async () => ({ amount: "130.00", currency: "KES" })),
}));
import { shoppingTools } from "../src/agent/tools";
import { searchProducts } from "../src/lib/catalog";
import { chatLimits } from "../src/lib/chat-budget";
const options = { toolCallId: "test", messages: [], context: {} };
beforeEach(() => vi.clearAllMocks());
describe("trusted agent budgets", () => {
  it.each(["under 5 dollars", "less than $5"])(
    "returns no expensive cards for %s even when the model omits or raises its limit",
    async (text) => {
      const budget = chatLimits(
        [{ role: "user", parts: [{ type: "text", text }] }],
        8000,
      ).usdCents;
      const tools = shoppingTools("session", budget);
      const search = tools.search_products.execute!;
      expect(await search({ query: "" }, options)).toMatchObject({
        products: [],
        budgetCents: 499,
        books: [{ amount: "130.00", usdEstimate: { cents: 100 } }],
      });
      expect(
        await search({ query: "", maxPriceCents: 8000 }, options),
      ).toMatchObject({ products: [], budgetCents: 499 });
      expect(
        await tools.get_product.execute!({ id: "socks" }, options),
      ).toHaveProperty("error");
      await expect(
        tools.prepare_checkout.execute!({ productId: "socks" }, options),
      ).rejects.toThrow("budget");
    },
  );
  it("honors an even lower tool limit and permits items within budget", async () => {
    const tools = shoppingTools("session", 2000);
    expect(
      await tools.search_products.execute!(
        { query: "", maxPriceCents: 500 },
        options,
      ),
    ).toMatchObject({ products: [] });
    expect(searchProducts).toHaveBeenLastCalledWith("", 500);
    expect(
      await tools.search_products.execute!({ query: "" }, options),
    ).toMatchObject({ products: [{ priceCents: 1600 }] });
  });
  it("enforces the independent KES budget even when the model raises it", async () => {
    const tools = shoppingTools("session", 499, undefined, 10000);
    expect(
      await tools.search_store_books.execute!(
        { query: "", maxPriceKES: 1000 },
        options,
      ),
    ).toMatchObject({ products: [] });
    await expect(
      tools.prepare_store_checkout.execute!(
        { variantId: "gid://shopify/ProductVariant/1" },
        options,
      ),
    ).rejects.toThrow("KES budget");
  });
});

it("finds KES 130 books under a $5 USD budget in a general fun search", async () => {
  const tools = shoppingTools("session", 499);
  const output = await tools.search_products.execute!(
    { query: "fun" },
    options,
  );
  expect(output).toMatchObject({
    products: [],
    books: [
      {
        amount: "130.00",
        currency: "KES",
        maxUsdCents: 499,
        usdEstimate: { cents: 100, kesPerUsd: 130 },
      },
    ],
  });
});
it("does not admit a KES 130 book under a $0.50 budget", async () => {
  const tools = shoppingTools("session", 50);
  expect(
    await tools.search_store_books.execute!({ query: "" }, options),
  ).toMatchObject({ products: [] });
  await expect(
    tools.prepare_store_checkout.execute!(
      { variantId: "gid://shopify/ProductVariant/1" },
      options,
    ),
  ).rejects.toThrow("USD budget");
});

it("also compares USD demo items against a typed KES budget", async () => {
  const tools = shoppingTools("session", 8000, undefined, 100000);
  expect(
    await tools.search_products.execute!({ query: "" }, options),
  ).toMatchObject({ products: [], budgetCents: 769 });
  expect(
    await tools.get_product.execute!({ id: "socks" }, options),
  ).toHaveProperty("error");
  await expect(
    tools.prepare_checkout.execute!({ productId: "socks" }, options),
  ).rejects.toThrow("budget");
});
