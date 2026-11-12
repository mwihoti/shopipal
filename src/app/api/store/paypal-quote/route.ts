import { z } from "zod";
import { prepareBookQuote } from "@/lib/quotes";
import { capCents, sandbox } from "@/lib/config";
import { body, failure, json, sameOrigin } from "@/lib/http";
import { session, guardRate } from "@/lib/session";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    sandbox();
    const payload = await body(
      request,
      z.object({
        variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        budgetCents: z.number().int().nonnegative().max(8000).optional(),
      }),
    );
    const sid = await session();
    await guardRate(request, sid, "book-quote", 10);
    return json(
      await prepareBookQuote(
        sid,
        payload.variantId,
        payload.expectedAmount,
        Math.min(payload.budgetCents ?? capCents(), capCents()),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
