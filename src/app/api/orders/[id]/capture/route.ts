import { sameOrigin, failure, json } from "@/lib/http";
import { session, guardRate } from "@/lib/session";
import { captureOrder } from "@/lib/orders";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const sid = await session();
    await guardRate(request, sid, "capture", 10);
    return json(await captureOrder((await params).id, sid));
  } catch (e) {
    return failure(e);
  }
}
