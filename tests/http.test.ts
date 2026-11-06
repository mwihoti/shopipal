import { describe, it, expect } from "vitest";
import { z } from "zod";
import { body, sameOrigin } from "../src/lib/http";
import { equal, dashboardToken } from "../src/lib/dashboard-auth";
describe("HTTP boundary", () => {
  it("rejects missing or foreign request origins", () => {
    const url = "http://localhost:3000/api/orders";
    expect(() => sameOrigin(new Request(url, { method: "POST" }))).toThrow(
      "origin",
    );
    expect(() =>
      sameOrigin(
        new Request(url, {
          method: "POST",
          headers: { origin: "https://foreign.example" },
        }),
      ),
    ).toThrow("origin");
    expect(() =>
      sameOrigin(
        new Request(url, {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("requires explicit approval and rejects malformed requests", async () => {
    const schema = z.object({ approved: z.literal(true) });
    await expect(
      body(
        new Request("http://localhost", {
          method: "POST",
          body: '{"approved":false}',
        }),
        schema,
      ),
    ).rejects.toThrow("fields");
    await expect(
      body(
        new Request("http://localhost", { method: "POST", body: "not json" }),
        schema,
      ),
    ).rejects.toThrow("JSON");
    await expect(
      body(
        new Request("http://localhost", {
          method: "POST",
          body: "x".repeat(32001),
        }),
        schema,
      ),
    ).rejects.toThrow("large");
  });
  it("signs merchant sessions and compares tokens precisely", () => {
    process.env.SESSION_SECRET = "test-secret-at-least-32-characters";
    const token = dashboardToken(1234);
    expect(token.startsWith("1234.")).toBe(true);
    expect(equal(token, dashboardToken(1234))).toBe(true);
    expect(equal(token, dashboardToken(1235))).toBe(false);
    expect(equal(token, "short")).toBe(false);
  });
});
