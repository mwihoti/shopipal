import { searchStoreBooks, getStoreBook } from "@/lib/shopify";
import { tool } from "ai";
import { z } from "zod";
import { searchProducts, getProduct } from "@/lib/catalog";
import { prepareQuote } from "@/lib/quotes";
export function shoppingTools(
  sessionId: string,
  budgetCents: number,
  ref?: string,
) {
  return {
    search_store_books: tool({
      description:
        "Search the connected pdf-color game Shopify store for real printable books. Prices are KES, not USD. Use short keywords or an empty query to browse. Only apply maxPriceKES when the shopper explicitly gives a KES budget. Return at most three matches; never describe colouring/activity books as reading storybooks.",
      inputSchema: z.object({
        query: z.string().max(200),
        maxPriceKES: z.number().finite().nonnegative().max(1000000).optional(),
      }),
      execute: async ({ query, maxPriceKES }) => {
        const result = await searchStoreBooks(query, maxPriceKES);
        return {
          ...result,
          products: result.products.slice(0, 3),
          hasMore: result.hasMore || result.products.length > 3,
        };
      },
    }),
    prepare_store_checkout: tool({
      description:
        "Prepare a review of a book variant previously found in the Shopify store. This returns current book details only. The shopper must click the review card and approve continuing to Shopify checkout. Never use this for sandbox products; it does not charge money or confirm a purchase.",
      inputSchema: z.object({
        variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
      }),
      execute: async ({ variantId }) => getStoreBook(variantId),
    }),
    search_products: tool({
      description:
        "Find available catalog products within the shopper budget. Return at most three matches.",
      inputSchema: z.object({ query: z.string().max(200) }),
      execute: async ({ query }) => ({
        products: (await searchProducts(query, budgetCents)).slice(0, 3),
      }),
    }),
    get_product: tool({
      description: "Read a product by its catalog identifier.",
      inputSchema: z.object({ id: z.string().max(80) }),
      execute: async ({ id }) =>
        (await getProduct(id)) || { error: "Product not found" },
    }),
    prepare_checkout: tool({
      description:
        "Prepare a review quote for a chosen product. The shopper must separately approve it and pay with PayPal.",
      inputSchema: z.object({ productId: z.string().max(80) }),
      execute: async ({ productId }) =>
        prepareQuote(sessionId, productId, budgetCents, ref),
    }),
  };
}
