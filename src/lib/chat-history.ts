import { z } from "zod";
import type { UIMessage } from "ai";

export const CHAT_STORAGE_KEY = "shopipal.chat.v1";
const text = z.string().max(12000);
const cents = z.number().int().nonnegative();
const book = z.object({
  variantId: text,
  title: text,
  variantTitle: text,
  description: text,
  image: text.nullable(),
  productUrl: text,
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.literal("KES"),
  maxUsdCents: cents.optional(),
  usdEstimate: z
    .object({
      cents,
      kesPerUsd: z.number().positive(),
      updatedAt: z.iso.datetime(),
    })
    .optional(),
});
const product = z.object({
  id: text,
  title: text,
  color: text,
  priceCents: cents,
});
const market = z.object({
  id: text,
  title: text,
  image: text.optional(),
  retailer: text,
  url: text,
  priceCents: cents,
  currency: z.literal("USD"),
});
const tool = {
  state: z.literal("output-available"),
  toolCallId: text,
  input: z.unknown().optional(),
};
const part = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text }),
  z.object({
    ...tool,
    type: z.literal("tool-search_products"),
    output: z.object({
      products: z.array(product).max(20).optional(),
      books: z.array(book).max(20).optional(),
    }),
  }),
  z.object({
    ...tool,
    type: z.literal("tool-search_store_books"),
    output: z.object({ products: z.array(book).max(20).optional() }),
  }),
  z.object({
    ...tool,
    type: z.literal("tool-search_market_products"),
    output: z.object({
      products: z.array(market).max(20).optional(),
      error: text.optional(),
    }),
  }),
  z.object({
    ...tool,
    type: z.literal("tool-prepare_store_checkout"),
    output: book,
  }),
]);
const history = z.object({
  version: z.literal(1),
  messages: z
    .array(
      z.object({
        id: text,
        role: z.enum(["user", "assistant"]),
        parts: z.array(part).max(30),
      }),
    )
    .max(24),
  budget: z.number().finite().min(1).max(80),
  draft: z.string().max(2000),
});
export type ChatHistory = {
  messages: UIMessage[];
  budget: number;
  draft: string;
};

export function serializeChatHistory(value: ChatHistory): string {
  // Keep visible search results and text; payment approvals and provider metadata stay transient.
  const messages = value.messages.slice(-24).flatMap((message) => {
    const parts = message.parts.slice(0, 30).flatMap((value) => {
      const parsed = part.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
    return parts.length ? [{ id: message.id, role: message.role, parts }] : [];
  });
  return JSON.stringify(
    history.parse({
      version: 1,
      messages,
      budget: value.budget,
      draft: value.draft,
    }),
  );
}

export function parseChatHistory(raw: string): ChatHistory | null {
  if (raw.length > 500000) return null;
  try {
    const parsed = history.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as ChatHistory) : null;
  } catch {
    return null;
  }
}
