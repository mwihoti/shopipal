import { cookies } from "next/headers";
import { z } from "zod";
import { body, sameOrigin, failure, json } from "@/lib/http";
import { required, AppError } from "@/lib/config";
import { rateLimit } from "@/lib/session";
import { equal, dashboardToken } from "@/lib/dashboard-auth";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(
      `login:${request.headers.get("x-forwarded-for") || "local"}`,
      5,
      15 * 60000,
    );
    await rateLimit("login:global", 100, 15 * 60000);
    const b = await body(
      request,
      z.object({ passphrase: z.string().max(200) }),
    );
    if (!equal(b.passphrase, required("DASHBOARD_PASSPHRASE")))
      throw new AppError(401, "Incorrect merchant passphrase.");
    const token = dashboardToken(Date.now() + 3600000);
    (await cookies()).set("shopipal_dashboard", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
