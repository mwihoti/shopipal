import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./config";
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const text = await request.text();
  if (text.length > 32000) throw new AppError(413, "Request is too large.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AppError(400, "Invalid JSON.");
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(400, "Please check the request fields.");
  return parsed.data;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin;
  if (origin !== expected)
    throw new AppError(403, "Request origin is not allowed.");
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  console.error(
    JSON.stringify({
      event: "request_failed",
      type: error instanceof Error ? error.name : "Unknown",
    }),
  );
  return NextResponse.json(
    { error: "Something went wrong. Please retry.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
export const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
