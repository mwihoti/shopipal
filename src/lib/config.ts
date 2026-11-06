export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}
export function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new AppError(503, `Configure ${name} to enable this feature.`, 'SETUP_REQUIRED');
  return value;
}
export function sandbox() {
  if (process.env.PAYPAL_ENVIRONMENT !== 'SANDBOX') throw new AppError(503, 'PayPal must be configured for SANDBOX.');
}
export const merchantName = () => process.env.MERCHANT_NAME || 'Shopipal Demo Store';
export function capCents() {
  const value = Number(process.env.SPENDING_CAP_USD || 80);
  if (!Number.isFinite(value) || value <= 0 || value > 80) throw new AppError(503, 'SPENDING_CAP_USD must be greater than zero and at most 80.');
  return Math.round(value * 100);
}
