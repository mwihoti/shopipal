import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { AppError } from "./config";
import { databaseConfig, hasRemoteDatabase } from "./database-config";
let client: Client | undefined;
export function database() {
  if (!client) {
    const config = databaseConfig();
    if (process.env.VERCEL && !hasRemoteDatabase(config.url))
      throw new AppError(
        503,
        "Store setup is incomplete. Set DATABASE_URL to your remote libSQL database URL in Vercel, configure DATABASE_AUTH_TOKEN, then redeploy. Local file databases only work in local development.",
      );
    client = createClient({
      ...config,
      url: config.url || "file:./data/shopipal.db",
    });
  }
  return client;
}
export const orm = () => drizzle(database());
