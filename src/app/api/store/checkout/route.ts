import { z } from "zod";
import { createStoreCheckout } from "@/lib/shopify";
import { body, failure, json, sameOrigin } from "@/lib/http";
import { session, guardRate } from "@/lib/session";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const payload = await body(
      request,
      z.object({
        variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        currency: z.literal("KES"),
        approved: z.literal(true),
      }),
    );
    await guardRate(request, await session(), "store-cart", 10);
    return json(
      await createStoreCheckout(
        payload.variantId,
        payload.expectedAmount,
        payload.currency,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
