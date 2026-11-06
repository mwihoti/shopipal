import { cookies } from "next/headers";
import { randomUUID, createHash } from "node:crypto";
import { database } from "./db";
import { AppError } from "./config";
export async function session() {
  const jar = await cookies();
  const existing = jar.get("shopipal_session")?.value;
  if (existing && /^[a-f0-9-]{36}$/.test(existing)) {
    const found = await database().execute({
      sql: "SELECT id FROM sessions WHERE id=?",
      args: [existing],
    });
    if (found.rows.length) return existing;
  }
  const id = randomUUID();
  await database().execute({
    sql: "INSERT INTO sessions(id,created_at) VALUES (?,?)",
    args: [id, Date.now()],
  });
  jar.set("shopipal_session", id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
  return id;
}
export async function rateLimit(key: string, max = 20, windowMs = 60000) {
  const now = Date.now();
  const hashed = createHash("sha256").update(key).digest("hex");
  const result = await database().execute({
    sql: `INSERT INTO rate_limits(key,count,reset_at) VALUES (?,1,?)
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,
 reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count`,
    args: [hashed, now + windowMs, now, now],
  });
  if (Number(result.rows[0].count) > max)
    throw new AppError(429, "Too many requests. Please try again shortly.");
}
export async function guardRate(
  request: Request,
  id: string,
  action: string,
  max = 20,
) {
  await rateLimit(`${action}:session:${id}`, max);
  await rateLimit(
    `${action}:ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`,
    max * 3,
  );
}
