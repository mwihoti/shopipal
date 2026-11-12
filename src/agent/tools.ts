import { searchMarketProducts } from "@/lib/channel3";
import { usdKesRate } from "@/lib/exchange-rate";
import { searchAffordableBooks, affordableBook } from "@/lib/book-budget";
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
  async function usdLimit() {
    if (storeBudgetCents === undefined) return budgetCents;
    const rate = await usdKesRate();
    return Math.min(budgetCents, Math.floor(storeBudgetCents / rate.kesPerUsd));
  }
  return {
    search_store_books: tool({
      description:
        "Search the connected pdf-color game Shopify store for real printable books. Server-converted USD estimates enforce the shopper USD budget against KES prices. Use short keywords or an empty query to browse. Only apply maxPriceKES when the shopper explicitly gives a KES budget. Return every matching available book; never describe colouring/activity books as reading storybooks.",
      inputSchema: z.object({
        query: z.string().max(200),
        maxPriceKES: z.number().finite().nonnegative().max(1000000).optional(),
      }),
      execute: async ({ query, maxPriceKES }) => {
        const max = Math.min(
          maxPriceKES ?? Infinity,
          storeBudgetCents === undefined ? Infinity : storeBudgetCents / 100,
        );
        const result = await searchAffordableBooks(
          query,
          budgetCents,
          Number.isFinite(max) ? Math.floor(max * 100) : undefined,
        );
        return result;
      },
    }),
    prepare_store_checkout: tool({
      description:
        "Prepare a review of a book variant previously found in the Shopify store. This returns current book details only. The shopper must click the review card and approve continuing to Shopify checkout. Never use this for sandbox products; it does not charge money or confirm a purchase.",
      inputSchema: z.object({
        variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
      }),
      execute: async ({ variantId }) =>
        affordableBook(variantId, budgetCents, storeBudgetCents),
    }),
    search_products: tool({
      description:
        "Find every available catalog product within the shopper budget, including connected Shopify books. Use an empty query for general price-only requests; use short item keywords only when a category or feature is requested. Return all matches, without a three-item limit.",
      inputSchema: z.object({
        query: z.string().max(200),
        maxPriceCents: z.number().int().nonnegative().optional(),
      }),
      execute: async ({ query, maxPriceCents }) => {
        const max = Math.min(await usdLimit(), maxPriceCents ?? budgetCents);
        const cleaned = query
          .replace(
            /\b(?:under|less than|below|up to|at most|within)\s*(?:US\$|\$|USD|KES|KSH)?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?\s*(?:USD|dollars?|KES|KSH|shillings?)?/gi,
            "",
          )
          .trim();
        const general =
          /^(?:(?:show|list|me|the|every|everything|fun|something|anything|gift|gifts|browse|all|available|affordable|cheap|budget|items|products)|\s|[.!?])*$/i.test(
            cleaned,
          );
        const searchQuery = general ? "" : cleaned;
        const products = await searchProducts(searchQuery, max);
        try {
          const result = await searchAffordableBooks(
            searchQuery,
            Math.min(budgetCents, maxPriceCents ?? budgetCents),
            storeBudgetCents,
          );
          return {
            products,
            books: result.products,
            hasMoreBooks: result.hasMore,
            budgetCents: max,
            exchangeRate: result.exchangeRate,
            message:
              "Prices in KES have been converted to estimated USD for this budget. Recommend only returned affordable items; checkout charges KES and may apply fees.",
          };
        } catch (error) {
          return {
            products,
            books: [],
            budgetCents: max,
            storeSearchError:
              error instanceof Error ? error.message : "Book store unavailable",
            message:
              "Only the USD catalog was checked. Do not say no affordable items exist across both stores: book prices could not be checked.",
          };
        }
      },
    }),
    search_market_products: tool({
      description:
        "Search real external retailer listings through Channel3. Use for market searches, reading books, or items missing from the connected catalogs. Requires a short nonempty product query. Returns up to three affordable USD offers with images and retailer checkout links. These cannot be purchased through the sandbox checkout tools.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(200),
        maxPriceCents: z.number().int().positive().optional(),
      }),
      execute: async ({ query, maxPriceCents }) => {
        try {
          return await searchMarketProducts(
            query,
            Math.min(await usdLimit(), maxPriceCents ?? budgetCents),
          );
        } catch {
          return {
            products: [],
            error:
              "Retailer search is unavailable. No external listings were verified; try again later. The connected book store and sandbox collection remain separate options.",
          };
        }
      },
    }),
    get_product: tool({
      description: "Read a product by its catalog identifier.",
      inputSchema: z.object({ id: z.string().max(80) }),
      execute: async ({ id }) => {
        const product = await getProduct(id);
        return product?.available && product.priceCents <= (await usdLimit())
          ? product
          : { error: "Product unavailable or outside the shopper budget" };
      },
    }),
    prepare_checkout: tool({
      description:
        "Prepare a review quote for a chosen product. The shopper must separately approve it and pay with PayPal.",
      inputSchema: z.object({ productId: z.string().max(80) }),
      execute: async ({ productId }) =>
        prepareQuote(sessionId, productId, await usdLimit(), ref),
    }),
  };
}
