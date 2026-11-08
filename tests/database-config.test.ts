import { afterEach, describe, expect, it, vi } from "vitest";
import {
  catalogPreviewMode,
  databaseConfig,
  hasRemoteDatabase,
} from "../src/lib/database-config";

afterEach(() => vi.unstubAllEnvs());
function configure(url: string | undefined) {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("TURSO_DATABASE_URL", undefined);
  vi.stubEnv("DATABASE_AUTH_TOKEN", undefined);
  vi.stubEnv("TURSO_AUTH_TOKEN", undefined);
}

describe("hosted database configuration", () => {
  it.each([undefined, "", "file:./data/shopipal.db", "not-a-url"])(
    "keeps the catalog in preview with %s",
    (url) => {
      configure(url);
      expect(catalogPreviewMode()).toBe(true);
    },
  );
  it.each([
    "libsql://shop.turso.io",
    "https://shop.turso.io",
    "wss://shop.turso.io",
  ])("accepts a remote libSQL endpoint: %s", (url) => {
    configure(url);
    expect(hasRemoteDatabase()).toBe(true);
    expect(catalogPreviewMode()).toBe(false);
  });
  it("uses the same Turso aliases for preview detection and database access", () => {
    configure(undefined);
    vi.stubEnv("TURSO_DATABASE_URL", " libsql://shop.turso.io ");
    vi.stubEnv("TURSO_AUTH_TOKEN", " example-token ");
    expect(databaseConfig()).toEqual({
      url: "libsql://shop.turso.io",
      authToken: "example-token",
    });
    expect(catalogPreviewMode()).toBe(false);
  });
  it("prefers explicit application variables over Turso aliases", () => {
    configure("libsql://primary.turso.io");
    vi.stubEnv("DATABASE_AUTH_TOKEN", "primary-token");
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://other.turso.io");
    vi.stubEnv("TURSO_AUTH_TOKEN", "other-token");
    expect(databaseConfig()).toEqual({
      url: "libsql://primary.turso.io",
      authToken: "primary-token",
    });
  });
  it("preserves local SQLite development", () => {
    configure("file::memory:");
    vi.stubEnv("VERCEL", undefined);
    expect(catalogPreviewMode()).toBe(false);
  });
  it("refuses local files for hosted transactions with setup instructions", async () => {
    configure("file:./data/shopipal.db");
    vi.resetModules();
    const { database } = await import("../src/lib/db");
    expect(() => database()).toThrow(
      "Set DATABASE_URL to your remote libSQL database URL in Vercel",
    );
  });
  it("serves all catalog products when a local database URL is deployed", async () => {
    configure("file:./data/shopipal.db");
    vi.resetModules();
    const { searchProducts } = await import("../src/lib/catalog");
    expect(await searchProducts()).toHaveLength(12);
  });
});
