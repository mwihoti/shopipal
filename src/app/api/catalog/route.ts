import { searchProducts } from "@/lib/catalog";
import { capCents } from "@/lib/config";
import { failure, json } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const max = Number(params.get("max") || capCents());
    return json({
      products: await searchProducts(
        (params.get("q") || "").slice(0, 200),
        Number.isFinite(max) ? max : capCents(),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
