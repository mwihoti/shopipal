import { afterEach, describe, expect, it, vi } from "vitest";
import { usdKesRate, kesToUsdCents } from "../src/lib/exchange-rate";
const rate = { kesPerUsd: 130, updatedAt: new Date().toISOString() };
afterEach(() => vi.unstubAllGlobals());
describe("trusted KES to USD conversion", () => {
  it("recognizes KES 130 as one dollar and rounds upward at cent boundaries", () => {
    expect(kesToUsdCents("130.00", rate)).toBe(100);
    expect(kesToUsdCents("650.00", rate)).toBe(500);
    expect(kesToUsdCents("130.01", rate)).toBe(101);
    expect(kesToUsdCents("130", { ...rate, kesPerUsd: 129.969067 })).toBe(101);
  });
  it("reads the daily provider rate with an hourly cache", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            result: "success",
            base_code: "USD",
            time_last_update_unix: Math.floor(Date.now() / 1000),
            rates: { KES: 129.97 },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await usdKesRate()).toMatchObject({ kesPerUsd: 129.97 });
    expect(fetcher).toHaveBeenCalledWith(
      "https://open.er-api.com/v6/latest/USD",
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });
  it.each([
    {
      result: "success",
      base_code: "USD",
      time_last_update_unix: Math.floor(Date.now() / 1000) - 49 * 3600,
      rates: { KES: 130 },
    },
    {
      result: "success",
      base_code: "USD",
      time_last_update_unix: Math.floor(Date.now() / 1000),
      rates: { KES: 0 },
    },
    {
      result: "success",
      base_code: "KES",
      time_last_update_unix: Math.floor(Date.now() / 1000),
      rates: { KES: 130 },
    },
    { result: "error" },
  ])("rejects stale, zero, wrong-base or missing rates", async (payload) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(payload))),
    );
    await expect(usdKesRate()).rejects.toThrow(
      "conversion is temporarily unavailable",
    );
  });
  it("does not fabricate a rate on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(usdKesRate()).rejects.toThrow(
      "conversion is temporarily unavailable",
    );
  });
});
