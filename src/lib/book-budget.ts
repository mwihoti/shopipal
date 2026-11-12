import { AppError } from "./config";
import { getStoreBook, searchStoreBooks } from "./shopify";
import { usdKesRate, kesToUsdCents, type ExchangeRate } from "./exchange-rate";
import type { StoreBook } from "./store-types";
export function withUsdEstimate(
  book: StoreBook,
  rate: ExchangeRate,
  maxUsdCents: number,
): StoreBook {
  return {
    ...book,
    maxUsdCents,
    usdEstimate: { cents: kesToUsdCents(book.amount, rate), ...rate },
  };
}
export async function searchAffordableBooks(
  query: string,
  maxUsdCents: number,
  maxKesCents?: number,
) {
  const rate = await usdKesRate();
  const maxKES = Math.min(
    (maxUsdCents / 100) * rate.kesPerUsd,
    maxKesCents === undefined ? Infinity : maxKesCents / 100,
  );
  const result = await searchStoreBooks(query, maxKES);
  return {
    ...result,
    products: result.products
      .map((book) => withUsdEstimate(book, rate, maxUsdCents))
      .filter((book) => book.usdEstimate!.cents <= maxUsdCents),
    exchangeRate: rate,
    budgetUsdCents: maxUsdCents,
  };
}
export async function affordableBook(
  variantId: string,
  maxUsdCents: number,
  maxKesCents?: number,
) {
  const [book, rate] = await Promise.all([
    getStoreBook(variantId),
    usdKesRate(),
  ]);
  if (
    maxKesCents !== undefined &&
    Math.round(Number(book.amount) * 100) > maxKesCents
  )
    throw new AppError(422, "This book exceeds the shopper's KES budget.");
  const priced = withUsdEstimate(book, rate, maxUsdCents);
  if (priced.usdEstimate!.cents > maxUsdCents)
    throw new AppError(
      422,
      "This book exceeds your USD budget at the current estimated exchange rate.",
    );
  return priced;
}
