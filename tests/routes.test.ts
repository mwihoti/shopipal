import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../src/lib/session", () => ({
  session: vi.fn(async () => "shopper-session"),
  guardRate: vi.fn(async () => {}),
}));
vi.mock("../src/lib/orders", () => ({
  approveAndCreate: vi.fn(async () => ({
    orderId: "internal",
    paypalOrderId: "paypal",
  })),
}));
const { POST } = await import("../src/app/api/orders/route");
const { approveAndCreate } = await import("../src/lib/orders");
const quoteId = "a305506b-ecf7-40d8-90d7-23d490132f8f";
const send = (payload: unknown, origin = "http://localhost:3000") =>
  POST(
    new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
beforeEach(() => vi.clearAllMocks());
describe("order creation endpoint", () => {
  it("rejects foreign origins before touching payments", async () => {
    expect(
      (await send({ quoteId, approved: true }, "https://foreign.example"))
        .status,
    ).toBe(403);
    expect(approveAndCreate).not.toHaveBeenCalled();
  });
  it("requires explicit approval", async () => {
    expect((await send({ quoteId, approved: false })).status).toBe(400);
    expect(approveAndCreate).not.toHaveBeenCalled();
  });
  it("does not forward client prices or merchant identifiers", async () => {
    const r = await send({
      quoteId,
      approved: true,
      amount: 1,
      merchant: "attacker",
    });
    expect(r.status).toBe(200);
    expect(approveAndCreate).toHaveBeenCalledExactlyOnceWith(
      quoteId,
      "shopper-session",
    );
  });
});
