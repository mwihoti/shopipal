import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { readFileSync } from "node:fs";
import type { PayPalOrder } from "../src/lib/paypal";
import { randomUUID } from "node:crypto";
vi.mock("../src/lib/paypal", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/paypal")>();
  return {
    ...original,
    createPayPalOrder: vi.fn(),
    getPayPalOrder: vi.fn(),
    capturePayPalOrder: vi.fn(),
  };
});
process.env.DATABASE_URL = ":memory:";
process.env.SPENDING_CAP_USD = "80";
const { database } = await import("../src/lib/db");
const { prepareQuote, ownedQuote, validateQuote } =
  await import("../src/lib/quotes");
const { approveAndCreate, captureOrder, orderReceipt } =
  await import("../src/lib/orders");
const paypal = await import("../src/lib/paypal");
const { shoppingTools } = await import("../src/agent/tools");
const db = database();
const sid = randomUUID();
const remote = (status = "APPROVED", value = "74.00"): PayPalOrder => ({
  id: "PP-1",
  status,
  purchase_units: [
    {
      payee: { merchant_id: "SELLER-1" },
      amount: { currency_code: "USD", value },
      ...(status === "COMPLETED"
        ? {
            payments: {
              captures: [
                {
                  id: "CAP-1",
                  status: "COMPLETED",
                  amount: { currency_code: "USD", value },
                },
              ],
            },
          }
        : {}),
    },
  ],
});
beforeAll(async () => {
  await db.batch(
    readFileSync(new URL("../data/schema.sql", import.meta.url), "utf8")
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean),
    "write",
  );
  await db.execute(
    readFileSync(
      new URL("../data/002-order-merchant.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.execute({
    sql: "INSERT INTO sessions(id,created_at) VALUES (?,?)",
    args: [sid, Date.now()],
  });
  await db.execute(
    "INSERT INTO products VALUES ('shoe','Trail Runner','Trail shoe','Footwear',7400,'/shoe.svg','sand',1,'running shoe')",
  );
  await db.execute("INSERT INTO creators VALUES ('alice','Alice',1500,1)");
});
beforeEach(async () => {
  vi.clearAllMocks();
  await db.execute("DELETE FROM orders");
  await db.execute("DELETE FROM quotes");
  await db.execute(
    "UPDATE products SET price_cents=7400,available=1 WHERE id='shoe'",
  );
  vi.mocked(paypal.createPayPalOrder).mockResolvedValue(remote("CREATED"));
  vi.mocked(paypal.getPayPalOrder).mockResolvedValue(remote());
  vi.mocked(paypal.capturePayPalOrder).mockImplementation(async () => {
    vi.mocked(paypal.getPayPalOrder).mockResolvedValue(remote("COMPLETED"));
    return remote("COMPLETED");
  });
});
afterAll(() => db.close());
describe("trusted checkout", () => {
  it("snapshots price and referral from database", async () => {
    const q = await prepareQuote(sid, "shoe", 8000, "alice");
    expect(q.amountCents).toBe(7400);
    expect(q.commissionBps).toBe(1500);
    expect(q.referralCode).toBe("alice");
  });
  it("rejects unknown products, low budget, and invalid referrals", async () => {
    await expect(prepareQuote(sid, "invented", 8000)).rejects.toThrow(
      "unavailable",
    );
    await expect(prepareQuote(sid, "shoe", 7000)).rejects.toThrow("budget");
    await expect(prepareQuote(sid, "shoe", 8000, "fake")).rejects.toThrow(
      "referral",
    );
  });
  it("rejects expired quotes and price changes", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    await db.execute({
      sql: "UPDATE quotes SET expires_at=0 WHERE id=?",
      args: [q.id],
    });
    await expect(approveAndCreate(q.id, sid)).rejects.toThrow("expired");
    await db.execute({
      sql: "UPDATE quotes SET expires_at=? WHERE id=?",
      args: [Date.now() + 10000, q.id],
    });
    await db.execute("UPDATE products SET price_cents=7500 WHERE id='shoe'");
    await expect(validateQuote(await ownedQuote(q.id, sid))).rejects.toThrow(
      "changed",
    );
  });
  it("binds quotes and orders to their shopper", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    await expect(approveAndCreate(q.id, randomUUID())).rejects.toThrow(
      "not found",
    );
    const o = await approveAndCreate(q.id, sid);
    await expect(captureOrder(o.orderId, randomUUID())).rejects.toThrow(
      "not found",
    );
  });
  it("creates only one PayPal order for a repeated approval", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const a = await approveAndCreate(q.id, sid);
    const b = await approveAndCreate(q.id, sid);
    expect(a).toEqual(b);
    expect(paypal.createPayPalOrder).toHaveBeenCalledTimes(1);
  });
  it("rejects capture when app approval is absent", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const o = await approveAndCreate(q.id, sid);
    await db.execute({
      sql: "UPDATE quotes SET approved_at=NULL WHERE id=?",
      args: [q.id],
    });
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow("approve");
    expect(paypal.capturePayPalOrder).not.toHaveBeenCalled();
  });
  it("requires PayPal approval and matching totals", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const o = await approveAndCreate(q.id, sid);
    vi.mocked(paypal.getPayPalOrder).mockResolvedValue(remote("CREATED"));
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow(
      "Approve this payment",
    );
    vi.mocked(paypal.getPayPalOrder).mockResolvedValue(
      remote("APPROVED", "1.00"),
    );
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow("amount");
    expect(paypal.capturePayPalOrder).not.toHaveBeenCalled();
  });
  it("rejects a changed receiving merchant", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const o = await approveAndCreate(q.id, sid);
    const altered = remote();
    altered.purchase_units[0].payee = { merchant_id: "OTHER-SELLER" };
    vi.mocked(paypal.getPayPalOrder).mockResolvedValue(altered);
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow("merchant");
    expect(paypal.capturePayPalOrder).not.toHaveBeenCalled();
  });
  it("captures once and records commission once", async () => {
    const q = await prepareQuote(sid, "shoe", 8000, "alice");
    const o = await approveAndCreate(q.id, sid);
    const r = await captureOrder(o.orderId, sid);
    expect(r.captureId).toBe("CAP-1");
    expect(r.commissionCents).toBe(1110);
    await captureOrder(o.orderId, sid);
    expect(paypal.capturePayPalOrder).toHaveBeenCalledTimes(1);
  });
  it("reconciles a lost capture response without charging again", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const o = await approveAndCreate(q.id, sid);
    vi.mocked(paypal.capturePayPalOrder).mockRejectedValue(
      new Error("timeout"),
    );
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow("timeout");
    vi.mocked(paypal.getPayPalOrder).mockResolvedValue(remote("COMPLETED"));
    expect((await orderReceipt(o.orderId, sid)).status).toBe("COMPLETED");
    expect(paypal.capturePayPalOrder).toHaveBeenCalledTimes(1);
  });
  it("serializes concurrent capture attempts", async () => {
    const q = await prepareQuote(sid, "shoe", 8000);
    const o = await approveAndCreate(q.id, sid);
    await db.execute({
      sql: "UPDATE orders SET lease_until=? WHERE id=?",
      args: [Date.now() + 90000, o.orderId],
    });
    await expect(captureOrder(o.orderId, sid)).rejects.toThrow(
      "being processed",
    );
    expect(paypal.capturePayPalOrder).not.toHaveBeenCalled();
  });
  it("gives the model no payment authority", () => {
    expect(Object.keys(shoppingTools(sid, 8000))).toEqual([
      "search_products",
      "get_product",
      "prepare_checkout",
    ]);
  });
});
