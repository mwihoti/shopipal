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
