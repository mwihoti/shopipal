import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStoreCheckout,
  getStoreBook,
  searchStoreBooks,
} from "../src/lib/shopify";
const id = "gid://shopify/ProductVariant/123";
const product = {
  id: "gid://shopify/Product/1",
  title: "Activity book",
  handle: "activity-book",
  description: "Printable PDF",
  onlineStoreUrl:
    "https://pdf-color-games.myshopify.com/products/activity-book",
  featuredImage: null,
};
const variant = {
  id,
  title: "Default Title",
  availableForSale: true,
  price: { amount: "130.0", currencyCode: "KES" },
};
const cart = {
  checkoutUrl: "https://pdf-color-games.myshopify.com/checkouts/test",
  totalQuantity: 1,
  lines: { nodes: [{ quantity: 1, merchandise: { id } }] },
};
function response(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
}
afterEach(() => vi.unstubAllGlobals());
describe("Shopify book checkout", () => {
  it("keeps KES prices separate and excludes unavailable or unpublished items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          products: {
            nodes: [
              {
                ...product,
                variants: {
                  nodes: [
                    variant,
                    { ...variant, id: "sold-out", availableForSale: false },
                  ],
                },
              },
              {
                ...product,
                onlineStoreUrl: null,
                variants: { nodes: [variant] },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        }),
      ),
    );
    expect((await searchStoreBooks()).products).toEqual([
      expect.objectContaining({
        amount: "130.0",
        currency: "KES",
        variantId: id,
      }),
    ]);
    expect((await searchStoreBooks("", 100)).products).toHaveLength(0);
  });
  it("rejects changed prices before creating a cart", async () => {
    const fetcher = vi.fn(async () =>
      response({ node: { ...variant, product } }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(createStoreCheckout(id, "1.00", "KES")).rejects.toThrow(
      "price changed",
    );
    await expect(createStoreCheckout(id, "130.00", "USD")).rejects.toThrow(
      "price changed",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("creates one verified variant without accepting caller totals", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ node: { ...variant, product } }))
      .mockResolvedValueOnce(
        response({ cartCreate: { cart, userErrors: [], warnings: [] } }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await createStoreCheckout(id, "130.00", "KES")).toEqual({
      checkoutUrl: cart.checkoutUrl,
    });
    const payload = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(payload.variables).toEqual({
      input: { lines: [{ merchandiseId: id, quantity: 1 }] },
    });
    expect(fetcher.mock.calls[1][0]).toBe(
      "https://pdf-color-games.myshopify.com/api/2026-10/graphql.json",
    );
  });
  it.each([
    { ...cart, checkoutUrl: "https://attacker.example/pay" },
    { ...cart, totalQuantity: 2 },
    {
      ...cart,
      lines: { nodes: [{ quantity: 1, merchandise: { id: "other" } }] },
    },
  ])("rejects altered carts or checkout hosts", async (altered) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ node: { ...variant, product } }))
        .mockResolvedValueOnce(
          response({
            cartCreate: { cart: altered, userErrors: [], warnings: [] },
          }),
        ),
    );
    await expect(createStoreCheckout(id, "130.00", "KES")).rejects.toThrow();
  });
  it("rejects unavailable variants and invalid identifiers", async () => {
    const fetcher = vi.fn(async () =>
      response({ node: { ...variant, availableForSale: false, product } }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(getStoreBook(id)).rejects.toThrow("no longer available");
    await expect(getStoreBook("https://example.com")).rejects.toThrow(
      "Select a book",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports service failure instead of inventing books", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ errors: [{ message: "Unavailable" }] }),
          ),
      ),
    );
    await expect(searchStoreBooks()).rejects.toThrow("temporarily unavailable");
  });
});
