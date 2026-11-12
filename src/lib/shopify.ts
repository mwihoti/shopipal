import { z } from "zod";
import { AppError } from "./config";
import { STORE_BOOK, STORE_BOOKS, STORE_CART } from "./shopify-operations";
import { STORE_DOMAIN, STORE_URL, type StoreBook } from "./store-types";
const money = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currencyCode: z.literal("KES"),
});
const variant = z.object({
  id: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  price: money,
});
const product = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  description: z.string(),
  onlineStoreUrl: z.string().nullable(),
  featuredImage: z
    .object({ url: z.string().url(), altText: z.string().nullable() })
    .nullable(),
});
async function storefront<T>(
  query: string,
  variables: object,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await fetch(`${STORE_URL}/api/2026-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length)
      throw new Error("Shopify request failed");
    return schema.parse(payload.data);
  } catch {
    throw new AppError(
      502,
      "The book store is temporarily unavailable. Please retry or visit the store directly.",
    );
  }
}
function book(
  p: z.infer<typeof product>,
  v: z.infer<typeof variant>,
): StoreBook {
  return {
    variantId: v.id,
    title: p.title,
    variantTitle: v.title === "Default Title" ? "" : v.title,
    description: p.description.slice(0, 1800),
    image: p.featuredImage?.url || null,
    productUrl: `${STORE_URL}/products/${encodeURIComponent(p.handle)}`,
    amount: v.price.amount,
    currency: v.price.currencyCode,
  };
}
export async function searchStoreBooks(query = "", maxPriceKES?: number) {
  // Only sanitized terms enter Shopify's search syntax; no caller-supplied filters.
  const terms = query
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .slice(0, 200);
  const result = await storefront(
    STORE_BOOKS,
    { query: terms },
    z.object({
      products: z.object({
        nodes: z.array(
          product.extend({ variants: z.object({ nodes: z.array(variant) }) }),
        ),
        pageInfo: z.object({ hasNextPage: z.boolean() }),
      }),
    }),
  );
  return {
    products: result.products.nodes
      .filter((p) => p.onlineStoreUrl)
      .flatMap((p) =>
        p.variants.nodes
          .filter(
            (v) =>
              v.availableForSale &&
              (maxPriceKES === undefined ||
                Number(v.price.amount) <= maxPriceKES),
          )
          .map((v) => book(p, v)),
      ),
    hasMore: result.products.pageInfo.hasNextPage,
    currency: "KES",
    storeUrl: STORE_URL,
  };
}
export async function getStoreBook(variantId: string) {
  if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variantId))
    throw new AppError(400, "Select a book from this store.");
  const result = await storefront(
    STORE_BOOK,
    { id: variantId },
    z.object({ node: variant.extend({ product }).nullable() }),
  );
  if (!result.node?.availableForSale || !result.node.product.onlineStoreUrl)
    throw new AppError(409, "This book is no longer available.");
  return book(result.node.product, result.node);
}
export async function createStoreCheckout(
  variantId: string,
  expectedAmount: string,
  currency: string,
) {
  const selected = await getStoreBook(variantId);
  if (
    selected.currency !== currency ||
    Number(selected.amount) !== Number(expectedAmount)
  )
    throw new AppError(
      409,
      "The book price changed. Refresh the collection and review it again.",
    );
  const result = await storefront(
    STORE_CART,
    { input: { lines: [{ merchandiseId: variantId, quantity: 1 }] } },
    z.object({
      cartCreate: z.object({
        cart: z
          .object({
            checkoutUrl: z.string().url(),
            totalQuantity: z.number(),
            lines: z.object({
              nodes: z.array(
                z.object({
                  quantity: z.number(),
                  merchandise: z.object({ id: z.string() }),
                }),
              ),
            }),
          })
          .nullable(),
        userErrors: z.array(z.object({ message: z.string() })),
        warnings: z.array(z.object({ message: z.string() })),
      }),
    }),
  );
  const { cart, userErrors, warnings } = result.cartCreate;
  if (
    userErrors.length ||
    warnings.length ||
    !cart ||
    cart.totalQuantity !== 1 ||
    cart.lines.nodes.length !== 1 ||
    cart.lines.nodes[0].quantity !== 1 ||
    cart.lines.nodes[0].merchandise.id !== variantId
  )
    throw new AppError(
      409,
      "The store could not prepare this book. Refresh and try again.",
    );
  const url = new URL(cart.checkoutUrl);
  if (url.protocol !== "https:" || url.hostname !== STORE_DOMAIN)
    throw new AppError(
      502,
      "The store returned an unexpected checkout address.",
    );
  return { checkoutUrl: cart.checkoutUrl };
}
