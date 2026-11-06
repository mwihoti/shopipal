import { failure, json } from "@/lib/http";
import { session, guardRate } from "@/lib/session";
import { orderReceipt } from "@/lib/orders";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sid = await session();
    await guardRate(request, sid, "receipt", 30);
    return json(await orderReceipt((await params).id, sid));
  } catch (e) {
    return failure(e);
  }
}
