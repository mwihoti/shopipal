import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { AppError } from "./config";
let client: Client | undefined;
export function database() {
  if (!client) {
    const url = process.env.DATABASE_URL || "file:./data/shopipal.db";
    if (process.env.VERCEL && !url.startsWith("libsql://"))
      throw new AppError(503, "Deployment requires a remote libSQL database.");
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}
export const orm = () => drizzle(database());
