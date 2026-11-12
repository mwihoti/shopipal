import { expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  parseChatHistory,
  serializeChatHistory,
} from "../src/lib/chat-history";

it("retains visible messages and search cards without payment or provider state", () => {
  const messages = [
    {
      id: "reply",
      role: "assistant",
      metadata: { provider: "private" },
      parts: [
        { type: "text", text: "Found a book" },
        { type: "reasoning", text: "internal reasoning" },
        {
          type: "tool-search_market_products",
          toolCallId: "search",
          state: "output-available",
          input: {},
          providerMetadata: { private: "data" },
          output: {
            products: [
              {
                id: "one",
                title: "Book",
                retailer: "books.example",
                url: "https://books.example/book",
                priceCents: 425,
                currency: "USD",
              },
            ],
          },
        },
        {
          type: "tool-prepare_checkout",
          toolCallId: "quote",
          state: "output-available",
          input: {},
          output: { id: "old-payment-quote" },
        },
      ],
    },
  ] as UIMessage[];
  const raw = serializeChatHistory({
    messages,
    budget: 20,
    draft: "A follow-up",
  });
  const restored = parseChatHistory(raw)!;
  expect(restored.budget).toBe(20);
  expect(restored.draft).toBe("A follow-up");
  expect(restored.messages[0].parts).toHaveLength(2);
  expect(raw).not.toMatch(/private|internal reasoning|old-payment-quote/);
});
it.each([
  "not json",
  JSON.stringify({ version: 99, messages: [] }),
  JSON.stringify({
    version: 1,
    messages: [
      {
        id: "broken",
        role: "assistant",
        parts: [
          {
            type: "tool-search_products",
            state: "output-available",
            output: { products: "broken" },
          },
        ],
      },
    ],
    budget: 80,
    draft: "",
  }),
])("ignores corrupt or incompatible history", (raw) => {
  expect(parseChatHistory(raw)).toBeNull();
});
it("keeps recent history within the server message limit", () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    id: String(index),
    role: "user" as const,
    parts: [{ type: "text" as const, text: `message ${index}` }],
  }));
  expect(
    parseChatHistory(serializeChatHistory({ messages, budget: 80, draft: "" }))!
      .messages,
  ).toHaveLength(24);
});
