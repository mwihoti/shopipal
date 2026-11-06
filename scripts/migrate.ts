import { config } from "dotenv";
import { readFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
const { database } = await import("../src/lib/db");
const db = database();
await db.execute(
  "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
);
for (const name of ["schema.sql", "002-order-merchant.sql"]) {
  const existing = await db.execute({
    sql: "SELECT name FROM migrations WHERE name=?",
    args: [name],
  });
  if (existing.rows.length) continue;
  const sql = await readFile(
    new URL(`../data/${name}`, import.meta.url),
    "utf8",
  );
  await db.batch(
    [
      ...sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
      {
        sql: "INSERT INTO migrations(name,applied_at) VALUES (?,?)",
        args: [name, Date.now()],
      },
    ],
    "write",
  );
}
console.log("Database migrations applied.");
db.close();
