import { z } from "zod";
import { AppError } from "./config";
export type ExchangeRate = { kesPerUsd: number; updatedAt: string };
export async function usdKesRate(): Promise<ExchangeRate> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Rate unavailable");
    const data = z
      .object({
        result: z.literal("success"),
        base_code: z.literal("USD"),
        time_last_update_unix: z.number().int().positive(),
        rates: z.object({ KES: z.number().finite().positive() }),
      })
      .parse(await response.json());
    const age = Date.now() - data.time_last_update_unix * 1000;
    if (age < -300000 || age > 48 * 3600000) throw new Error("Stale rate");
    return {
      kesPerUsd: data.rates.KES,
      updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
    };
  } catch {
    throw new AppError(
      503,
      "Currency conversion is temporarily unavailable. View the store's KES prices directly or retry; dollar affordability cannot currently be verified.",
    );
  }
}
// Round estimates upward so cent rounding never admits an over-budget item.
export function kesToUsdCents(amount: string, rate: ExchangeRate) {
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    !Number.isFinite(rate.kesPerUsd) ||
    rate.kesPerUsd <= 0
  )
    throw new AppError(502, "Invalid currency amount or exchange rate.");
  const cents = Math.ceil((Number(amount) / rate.kesPerUsd) * 100);
  if (!Number.isSafeInteger(cents))
    throw new AppError(502, "Invalid currency amount.");
  return cents;
}
