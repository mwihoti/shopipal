import { z } from "zod";
import { AppError } from "./config";
import { publicHttpsUrl, type MarketProduct } from "./market-types";

const offerSchema = z.object({
  url: z.string().max(4000).refine(publicHttpsUrl),
  domain: z.string().max(200),
  availability: z.literal("InStock"),
  price: z.object({
    price: z.number().finite().positive(),
    currency: z.literal("USD"),
  }),
});
const productSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  images: z
    .array(z.object({ url: z.string(), cleaned_url: z.string().nullish() }))
    .optional(),
  offers: z.array(z.unknown()),
});

export async function searchMarketProducts(query: string, budgetCents: number) {
  const apiKey = process.env.CHANNEL3_API_KEY?.trim();
  if (!apiKey)
    throw new AppError(503, "Retailer search is not configured yet.");
  const max = Math.floor(budgetCents);
  if (!Number.isSafeInteger(max) || max < 1 || max > 8000)
    throw new AppError(
      400,
      "Retailer search needs a budget between $0.01 and $80.",
    );
  const text = query.trim().slice(0, 200);
  if (!text)
    throw new AppError(400, "Tell me what to search for at retailers.");
  try {
    const response = await fetch("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query: text,
        limit: 12,
        filters: { price: { max_price: max / 100 }, availability: ["InStock"] },
        config: { currency: "USD", mode: "default" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) throw new Error("upstream");
    const data = z
      .object({ products: z.array(z.unknown()).max(100) })
      .parse(await response.json());
    const products: MarketProduct[] = [];
    const seen = new Set<string>();
    for (const raw of data.products) {
      const parsed = productSchema.safeParse(raw);
      if (!parsed.success || seen.has(parsed.data.id)) continue;
      const product = parsed.data;
      const offers = product.offers
        .flatMap((rawOffer) => {
          const offer = offerSchema.safeParse(rawOffer);
          if (!offer.success) return [];
          const priceCents = Math.ceil(offer.data.price.price * 100 - 1e-8);
          return Number.isSafeInteger(priceCents) && priceCents <= max
            ? [{ ...offer.data, priceCents }]
            : [];
        })
        .sort((a, b) => a.priceCents - b.priceCents);
      const offer = offers[0];
      if (!offer) continue;
      const image = product.images
        ?.flatMap((image) => [image.cleaned_url, image.url])
        .find((url): url is string => !!url && publicHttpsUrl(url));
      seen.add(product.id);
      products.push({
        id: product.id,
        title: product.title,
        image,
        retailer: offer.domain,
        url: offer.url,
        priceCents: offer.priceCents,
        currency: "USD",
      });
      if (products.length === 3) break;
    }
    return {
      products,
      budgetCents: max,
      source: "Channel3",
      message:
        "External retailer listings. Item prices exclude possible shipping, taxes and currency fees. Check final price, shipping destination and availability at the retailer. Payment and fulfillment happen there, separately from Shopipal's PayPal sandbox.",
    };
  } catch {
    throw new AppError(
      503,
      "Retailer search is temporarily unavailable. Please retry or browse the book store and sandbox collection.",
    );
  }
}
