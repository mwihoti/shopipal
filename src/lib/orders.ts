import { randomUUID } from "node:crypto";
import { database } from "./db";
import { AppError } from "./config";
import { ownedQuote, validateQuote, publicQuote } from "./quotes";
import {
  createPayPalOrder,
  getPayPalOrder,
  capturePayPalOrder,
  verifyAmount,
  type PayPalOrder,
} from "./paypal";
import { commission, decimal } from "./money";
import type { Order, Quote } from "./schema";
export async function ownedOrder(id: string, sessionId: string) {
  const r = await database().execute({
    sql: "SELECT * FROM orders WHERE id=? AND session_id=?",
    args: [id, sessionId],
  });
  if (!r.rows[0]) throw new AppError(404, "Order not found.");
  return r.rows[0] as unknown as Order;
}
async function lease(id: string) {
  const result = await database().execute({
    sql: "UPDATE orders SET lease_until=? WHERE id=? AND lease_until<? RETURNING id",
    args: [Date.now() + 90000, id, Date.now()],
  });
  if (!result.rows.length)
    throw new AppError(
      409,
      "Payment is being processed. Check again shortly.",
      "PROCESSING",
    );
}
async function release(id: string) {
  await database().execute({
    sql: "UPDATE orders SET lease_until=0 WHERE id=?",
    args: [id],
  });
}
export async function approveAndCreate(quoteId: string, sessionId: string) {
  const q = await ownedQuote(quoteId, sessionId);
  await validateQuote(q);
  const id = randomUUID();
  await database().batch(
    [
      {
        sql: "UPDATE quotes SET approved_at=COALESCE(approved_at,?) WHERE id=? AND session_id=?",
        args: [Date.now(), q.id, sessionId],
      },
      {
        sql: "INSERT OR IGNORE INTO orders(id,quote_id,session_id,created_at) VALUES (?,?,?,?)",
        args: [id, q.id, sessionId, Date.now()],
      },
    ],
    "write",
  );
  const r = await database().execute({
    sql: "SELECT * FROM orders WHERE quote_id=?",
    args: [q.id],
  });
  let o = r.rows[0] as unknown as Order;
  if (o.paypal_order_id)
    return { orderId: o.id, paypalOrderId: o.paypal_order_id };
  await lease(o.id);
  try {
    const created = await createPayPalOrder(q, o.id);
    if (!created.id)
      throw new AppError(502, "PayPal did not return an order identifier.");
    const details = await getPayPalOrder(created.id);
    verifyAmount(details, q.amount_cents);
    const merchantId = details.purchase_units[0].payee?.merchant_id;
    if (!merchantId)
      throw new AppError(
        502,
        "PayPal did not identify the receiving merchant.",
      );
    await database().execute({
      sql: "UPDATE orders SET paypal_order_id=?,paypal_merchant_id=?,status='CREATED' WHERE id=?",
      args: [created.id, merchantId, o.id],
    });
    o = await ownedOrder(o.id, sessionId);
    return { orderId: o.id, paypalOrderId: o.paypal_order_id };
  } finally {
    await release(o.id);
  }
}
function verifyMerchant(o: Order, p: PayPalOrder) {
  if (
    !o.paypal_merchant_id ||
    p.purchase_units[0].payee?.merchant_id !== o.paypal_merchant_id
  )
    throw new AppError(
      409,
      "PayPal receiving merchant does not match this order.",
    );
}
async function recordCompleted(o: Order, q: Quote, p: PayPalOrder) {
  verifyAmount(p, q.amount_cents);
  verifyMerchant(o, p);
  const captures = p.purchase_units[0].payments?.captures;
  if (
    p.status !== "COMPLETED" ||
    captures?.length !== 1 ||
    captures[0].status !== "COMPLETED"
  )
    return false;
  const c = captures[0];
  if (
    c.amount.currency_code !== "USD" ||
    c.amount.value !== decimal(q.amount_cents)
  )
    throw new AppError(409, "Captured amount does not match the purchase.");
  await database().execute({
    sql: "UPDATE orders SET status='COMPLETED',paypal_capture_id=?,captured_at=COALESCE(captured_at,?),commission_cents=? WHERE id=?",
    args: [
      c.id,
      Date.now(),
      commission(q.amount_cents, q.commission_bps),
      o.id,
    ],
  });
  console.info(
    JSON.stringify({
      event: "payment_completed",
      orderId: o.id,
      captureId: c.id,
    }),
  );
  return true;
}
export async function captureOrder(id: string, sessionId: string) {
  const o = await ownedOrder(id, sessionId);
  const q = await ownedQuote(o.quote_id, sessionId);
  if (!q.approved_at)
    throw new AppError(403, "Review and approve this purchase before payment.");
  if (o.status === "COMPLETED") return receipt(o, q);
  if (!o.paypal_order_id)
    throw new AppError(409, "PayPal checkout has not been created.");
  await lease(o.id);
  try {
    const remote = await getPayPalOrder(o.paypal_order_id);
    verifyAmount(remote, q.amount_cents);
    verifyMerchant(o, remote);
    if (await recordCompleted(o, q, remote))
      return receipt(await ownedOrder(id, sessionId), q);
    await validateQuote(q);
    if (remote.status !== "APPROVED")
      throw new AppError(
        409,
        "Approve this payment in PayPal before capturing.",
      );
    await database().execute({
      sql: "UPDATE orders SET status='CAPTURING' WHERE id=?",
      args: [id],
    });
    await capturePayPalOrder(o.paypal_order_id, o.id);
    const captured = await getPayPalOrder(o.paypal_order_id);
    if (!(await recordCompleted(o, q, captured))) {
      await database().execute({
        sql: "UPDATE orders SET status='PENDING' WHERE id=?",
        args: [id],
      });
    }
    return receipt(await ownedOrder(id, sessionId), q);
  } finally {
    await release(id);
  }
}
export async function orderReceipt(id: string, sessionId: string) {
  let o = await ownedOrder(id, sessionId);
  const q = await ownedQuote(o.quote_id, sessionId);
  if (o.paypal_order_id && o.status !== "COMPLETED" && q.approved_at) {
    const remote = await getPayPalOrder(o.paypal_order_id);
    await recordCompleted(o, q, remote);
    o = await ownedOrder(id, sessionId);
  }
  return receipt(o, q);
}
function receipt(o: Order, q: Quote) {
  return {
    id: o.id,
    status: o.status,
    paypalOrderId: o.paypal_order_id,
    captureId: o.paypal_capture_id,
    capturedAt: o.captured_at,
    commissionCents: o.commission_cents,
    quote: publicQuote(q),
  };
}
export type Receipt = ReturnType<typeof receipt>;
