import { cookies } from "next/headers";
import { sameOrigin, failure, json } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    (await cookies()).delete("shopipal_dashboard");
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
