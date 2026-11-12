import { searchStoreBooks } from "@/lib/shopify";
import { json, failure } from "@/lib/http";
export async function GET(request: Request) {
  try {
    return json(
      await searchStoreBooks(
        (new URL(request.url).searchParams.get("q") || "").slice(0, 200),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
