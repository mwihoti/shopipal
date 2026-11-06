import { randomUUID } from "node:crypto";
import { database } from "./db";
import { getProduct } from "./catalog";
import { AppError, capCents, merchantName } from "./config";
import { withinBudget } from "./money";
import type { Quote } from "./schema";
export async function referral(code?: string | null) {
  if (!code) return null;
  const result = await database().execute({
    sql: "SELECT code,display_name,commission_bps FROM creators WHERE code=? AND active=1",
    args: [code.toLowerCase()],
  });
  return result.rows[0] || null;
}
export async function prepareQuote(
  sessionId: string,
  productId: string,
  budgetCents: number,
  ref?: string | null,
) {
  const p = await getProduct(productId);
  if (!p?.available) throw new AppError(409, "This product is unavailable.");
  if (!withinBudget(p.priceCents, budgetCents, capCents()))
    throw new AppError(422, "This item exceeds your budget or spending cap.");
  const creator = await referral(ref);
  if (ref && !creator)
    throw new AppError(
      422,
      "This referral code is no longer active. Remove it and try again.",
    );
  const quote: Quote = {
    id: randomUUID(),
    session_id: sessionId,
    product_id: p.id,
    title: p.title,
    amount_cents: p.priceCents,
    currency: "USD",
    budget_cents: budgetCents,
    merchant: merchantName(),
    referral_code: creator ? String(creator.code) : null,
    commission_bps: creator ? Number(creator.commission_bps) : 0,
    expires_at: Date.now() + 15 * 60000,
    approved_at: null,
  };
  const keys = Object.keys(quote);
  await database().execute({
    sql: `INSERT INTO quotes(${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    args: Object.values(quote),
  });
  return publicQuote(quote);
}
export function publicQuote(q: Quote) {
  return {
    id: q.id,
    productId: q.product_id,
    title: q.title,
    amountCents: q.amount_cents,
    currency: q.currency,
    budgetCents: q.budget_cents,
    merchant: q.merchant,
    referralCode: q.referral_code,
    commissionBps: q.commission_bps,
    expiresAt: q.expires_at,
  };
}
export type PublicQuote = ReturnType<typeof publicQuote>;
export async function ownedQuote(id: string, sessionId: string) {
  const result = await database().execute({
    sql: "SELECT * FROM quotes WHERE id=? AND session_id=?",
    args: [id, sessionId],
  });
  if (!result.rows[0]) throw new AppError(404, "Purchase review not found.");
  return result.rows[0] as unknown as Quote;
}
export async function validateQuote(q: Quote) {
  if (q.expires_at < Date.now())
    throw new AppError(409, "This review expired. Select the product again.");
  const product = await getProduct(q.product_id);
  if (!product?.available || product.priceCents !== q.amount_cents)
    throw new AppError(
      409,
      "The product changed. Review a fresh price before paying.",
    );
  if (!withinBudget(q.amount_cents, q.budget_cents, capCents()))
    throw new AppError(422, "This purchase exceeds your budget or cap.");
}
