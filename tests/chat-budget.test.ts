import { describe, it, expect } from "vitest";
import { chatLimits } from "../src/lib/chat-budget";
const user = (text: string) => ({
  role: "user",
  parts: [{ type: "text", text }],
});
describe("shopper price constraints", () => {
  it.each([
    ["Show me something for fun I can buy under 5 dollars", 499],
    ["Show me something for fun I can buy less than $5", 499],
    ["under $5.50", 549],
    ["up to $5", 500],
    ["at most 5 USD", 500],
    ["my budget is $20", 2000],
    ["spend $5", 500],
    ["I have $5", 500],
    ["$5", 500],
    ["5 dollars", 500],
    ["under $0", 0],
  ])("enforces %s", (text, cents) =>
    expect(chatLimits([user(text)], 8000).usdCents).toBe(cents),
  );
  it("retains the shopper limit across follow-ups and ignores assistant prices", () => {
    expect(
      chatLimits(
        [
          user("under $5"),
          { role: "assistant", parts: [{ type: "text", text: "under $80" }] },
          user("anything fun?"),
        ],
        8000,
      ).usdCents,
    ).toBe(499);
  });
  it("lets an explicit new budget replace the old one but never raise the control limit", () => {
    expect(
      chatLimits([user("under $5"), user("up to $25")], 2000).usdCents,
    ).toBe(2000);
  });
  it("never converts a KES request into a USD budget", () => {
    expect(chatLimits([user("under 150 KES")], 8000)).toEqual({
      usdCents: 8000,
      kesCents: 14999,
    });
    expect(chatLimits([user("under $5 and at most KES 150")], 8000)).toEqual({
      usdCents: 499,
      kesCents: 15000,
    });
  });
  it("does not mistake ages or page counts for a price", () => {
    expect(
      chatLimits([user("a book for 5 year olds with 10 pages")], 8000),
    ).toEqual({ usdCents: 8000 });
    expect(chatLimits([user("books for kids under 5 years")], 8000)).toEqual({
      usdCents: 8000,
    });
  });
  it("ignores quoted product prices and non-text tool data", () => {
    expect(
      chatLimits(
        [
          user("This item costs $16. What is it?"),
          {
            role: "user",
            parts: [{ type: "tool-search_products", text: "under $1" }],
          },
        ],
        8000,
      ),
    ).toEqual({ usdCents: 8000 });
  });
});
