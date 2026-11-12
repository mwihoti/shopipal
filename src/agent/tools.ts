import { searchStoreBooks, getStoreBook } from "@/lib/shopify";
import { AppError } from "@/lib/config";
import { tool } from "ai";
import { z } from "zod";
import { searchProducts, getProduct } from "@/lib/catalog";
import { prepareQuote } from "@/lib/quotes";
export function shoppingTools(
  sessionId: string,
  budgetCents: number,
  ref?: string,
  storeBudgetCents?: number,
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
        const max = Math.min(
          maxPriceKES ?? Infinity,
          storeBudgetCents === undefined ? Infinity : storeBudgetCents / 100,
        );
        const result = await searchStoreBooks(
          query,
          Number.isFinite(max) ? max : undefined,
        );
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
      execute: async ({ variantId }) => {
        const book = await getStoreBook(variantId);
        if (
          storeBudgetCents !== undefined &&
          Math.round(Number(book.amount) * 100) > storeBudgetCents
        )
          throw new AppError(
            422,
            "This book exceeds the shopper's KES budget.",
          );
        return book;
      },
    }),
    search_products: tool({
      description:
        "Find available catalog products within the shopper budget. Return at most three matches.",
      inputSchema: z.object({
        query: z.string().max(200),
        maxPriceCents: z.number().int().nonnegative().optional(),
      }),
      execute: async ({ query, maxPriceCents }) => {
        const max = Math.min(budgetCents, maxPriceCents ?? budgetCents);
        const products = (await searchProducts(query, max)).slice(0, 3);
        return {
          products,
          budgetCents: max,
          ...(products.length
            ? {}
            : {
                message:
                  "No matching items within this USD budget. Do not recommend more expensive products.",
              }),
        };
      },
    }),
    get_product: tool({
      description: "Read a product by its catalog identifier.",
      inputSchema: z.object({ id: z.string().max(80) }),
      execute: async ({ id }) => {
        const product = await getProduct(id);
        return product?.available && product.priceCents <= budgetCents
          ? product
          : { error: "Product unavailable or outside the shopper budget" };
      },
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
