import { referral } from "@/lib/quotes";
import { failure, json } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const r = await referral(
      (new URL(request.url).searchParams.get("code") || "").slice(0, 40),
    );
    return json({
      referral: r ? { code: r.code, name: r.display_name } : null,
    });
  } catch (e) {
    return failure(e);
  }
}
