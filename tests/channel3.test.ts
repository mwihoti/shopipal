import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { searchMarketProducts } from "../src/lib/channel3";
import { publicHttpsUrl } from "../src/lib/market-types";
const offer = (price: number, extra = {}) => ({
  url: "https://buy.example/item?track=one",
  domain: "retailer.example",
  availability: "InStock",
  price: { price, currency: "USD" },
  ...extra,
});
const product = (id: string, offers = [offer(4)]) => ({
  id,
  title: "Reading book",
  images: [{ url: "https://images.example/book.jpg" }],
  offers,
});
const fetcher = vi.fn();
beforeEach(() => {
  vi.stubEnv("CHANNEL3_API_KEY", "test-server-key");
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("uses authenticated server search and pairs an affordable price with its own retailer link", async () => {
  fetcher.mockResolvedValue(
    Response.json({
      products: [
        product("one", [offer(16), offer(4.25)]),
        product("two", [offer(5)]),
      ],
    }),
  );
  const result = await searchMarketProducts("reading books", 499);
  expect(result.products).toHaveLength(1);
  expect(result.products[0]).toMatchObject({
    priceCents: 425,
    url: "https://buy.example/item?track=one",
    retailer: "retailer.example",
  });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.trychannel3.com/v1/search");
  expect(init.headers["x-api-key"]).toBe("test-server-key");
  expect(JSON.parse(init.body)).toMatchObject({
    filters: { price: { max_price: 4.99 } },
    config: { currency: "USD" },
  });
  expect(JSON.stringify(result)).not.toContain("test-server-key");
});
it("rejects unsafe links, wrong currencies, missing prices and sold out offers; deduplicates products", async () => {
  fetcher.mockResolvedValue(
    Response.json({
      products: [
        product("unsafe", [offer(1, { url: "javascript:alert(1)" })]),
        product("kes", [offer(1, { price: { price: 130, currency: "KES" } })]),
        product("sold", [offer(1, { availability: "OutOfStock" })]),
        product("missing", [offer(1, { price: {} })]),
        product("good"),
        product("good"),
        { title: "malformed" },
      ],
    }),
  );
  expect(
    (await searchMarketProducts("books", 499)).products.map((p) => p.id),
  ).toEqual(["good"]);
});
it("does not round an above-budget price down", async () => {
  fetcher.mockResolvedValue(
    Response.json({ products: [product("over", [offer(4.991)])] }),
  );
  expect((await searchMarketProducts("books", 499)).products).toEqual([]);
});
it("requires configuration and sanitizes provider failures", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  await expect(searchMarketProducts("books", 500)).rejects.toThrow(
    "not configured",
  );
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv("CHANNEL3_API_KEY", "test-server-key");
  fetcher.mockResolvedValue(
    new Response("secret provider payload", { status: 401 }),
  );
  await expect(searchMarketProducts("books", 500)).rejects.toThrow(
    "temporarily unavailable",
  );
});
it.each([
  "http://shop.example/a",
  "https://127.0.0.1/a",
  "https://localhost/a",
  "https://user:pass@shop.example/a",
  "data:text/plain,a",
])("blocks unsafe public URL %s", (url) =>
  expect(publicHttpsUrl(url)).toBe(false),
);
