import { z } from "zod";
import { body, sameOrigin, failure, json } from "@/lib/http";
import { session, guardRate } from "@/lib/session";
import { approveAndCreate } from "@/lib/orders";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const id = await session();
    await guardRate(request, id, "order", 10);
    const b = await body(
      request,
      z.object({ quoteId: z.string().uuid(), approved: z.literal(true) }),
    );
    return json(await approveAndCreate(b.quoteId, id));
  } catch (e) {
    return failure(e);
  }
}
