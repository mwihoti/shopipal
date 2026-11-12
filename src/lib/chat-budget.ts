type Message = { role: string; parts: unknown[] };
export type ChatLimits = { usdCents: number; kesCents?: number };

// Read only explicit upper-price requests in shopper messages. Assistant text and
// product descriptions cannot set a budget. Keep USD and KES independent.
export function chatLimits(
  messages: Message[],
  controlCents: number,
): ChatLimits {
  let usd: number | undefined;
  let kes: number | undefined;
  const pattern =
    /\b(under|less than|below|up to|at most|no more than|within|maximum(?: of)?|max(?:imum)? budget(?: of| is)?|budget(?: of| is|:)?|spend(?:ing)?(?: up to)?|for)\s*(US\$|\$|USD\s*|KES\s*|KSH\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(USD\b|dollars?\b|KES\b|KSH\b|shillings?\b)?/gi;
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.parts
      .map((part) =>
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
          ? part.text
          : "",
      )
      .join(" ");
    for (const match of text.matchAll(pattern)) {
      const prefix = match[2]?.trim().toUpperCase() || "";
      const suffix = match[4]?.toUpperCase() || "";
      const currency = /KES|KSH|SHILLING/.test(prefix + suffix) ? "KES" : "USD";
      if (currency === "KES" && /\$|USD|DOLLAR/.test(prefix + suffix)) continue;
      const amount = Math.round(Number(match[3].replaceAll(",", "")) * 100);
      if (!Number.isSafeInteger(amount)) continue;
      const cents = Math.max(
        0,
        amount - (/^(under|less than|below)$/i.test(match[1]) ? 1 : 0),
      );
      if (currency === "KES") kes = cents;
      else usd = cents;
    }
  }
  return {
    usdCents: Math.min(controlCents, usd ?? controlCents),
    ...(kes === undefined ? {} : { kesCents: kes }),
  };
}
