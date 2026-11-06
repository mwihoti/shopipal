import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError, required } from "./config";
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function dashboardToken(expiry: number) {
  const signature = createHmac("sha256", required("SESSION_SECRET"))
    .update(`dashboard:${expiry}`)
    .digest("hex");
  return `${expiry}.${signature}`;
}
export async function dashboardAuth() {
  const token = (await cookies()).get("shopipal_dashboard")?.value;
  const expiry = Number(token?.split(".")[0]);
  if (
    !token ||
    !Number.isSafeInteger(expiry) ||
    expiry < Date.now() ||
    !equal(token, dashboardToken(expiry))
  )
    throw new AppError(401, "Sign in to view merchant orders.");
}
