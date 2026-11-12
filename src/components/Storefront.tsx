"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowUp,
  Check,
  Compass,
  Leaf,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import type { Product } from "@/lib/schema";
import type { PublicQuote } from "@/lib/quotes";
import type { Receipt } from "@/lib/orders";
import { chatLimits } from "@/lib/chat-budget";
import { money } from "@/lib/money";
import { request } from "@/lib/client";
import { BookStore, StoreBookReview } from "./BookStore";
import { bookPrice, type StoreBook } from "@/lib/store-types";
import { ProductCard } from "./ProductCard";
import { PurchaseDialog } from "./PurchaseDialog";
import { ApprovalCard, ReceiptCard } from "./ApprovalCard";
export function Storefront({ previewMode = false }: { previewMode?: boolean }) {
  const [book, setBook] = useState<StoreBook | null>(null);
  const [products, setProducts] = useState<Product[]>([]),
    [category, setCategory] = useState("All finds"),
    [input, setInput] = useState(""),
    [budget, setBudget] = useState(80),
    [ref, setRef] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [quote, setQuote] = useState<PublicQuote | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [pending, setPending] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          budgetCents: Math.round(budget * 100),
          ...(ref ? { ref } : {}),
        },
      }),
    [budget, ref],
  );
  const {
    messages,
    sendMessage,
    status,
    error: chatError,
    clearError,
  } = useChat({ transport });
  const chatting = status === "submitted" || status === "streaming";
  useEffect(() => {
    let active = true;
    request<{ products: Product[] }>("/api/catalog?max=999999")
      .then((r) => {
        if (active) {
          setProducts(r.products);
          if (!previewMode)
            setPending(localStorage.getItem("shopipal.pending") || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && !previewMode)
      request<{ referral: { code: string; name: string } | null }>(
        `/api/referral?code=${encodeURIComponent(code)}`,
      )
        .then((r) => {
          if (active) {
            if (r.referral) {
              setRef(r.referral.code);
              setNotice(
                `You're shopping with ${r.referral.name}'s referral. No extra cost to you.`,
              );
            } else
              setNotice(
                "That referral code is not active. You can continue without it.",
              );
          }
        })
        .catch(() => {
          if (active)
            setNotice(
              "Referral could not be verified. Shopping without attribution.",
            );
        });
    return () => {
      active = false;
    };
  }, [previewMode]);
  const closePanel = useCallback(() => {
    setQuote(null);
    setReceipt(null);
    setBook(null);
  }, []);
  const onComplete = useCallback((r: Receipt) => {
    setReceipt(r);
    setQuote(null);
    if (r.status === "COMPLETED") {
      localStorage.removeItem("shopipal.pending");
      setPending("");
    } else setPending(r.id);
  }, []);
  function reviewBook(selected: StoreBook) {
    setQuote(null);
    setReceipt(null);
    setBook(selected);
  }
  async function select(product: Product) {
    setBook(null);
    if (previewMode) return;
    setBusy(true);
    setError("");
    try {
      const q = await request<PublicQuote>("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          budgetCents: Math.round(budget * 100),
          ...(ref ? { ref } : {}),
        }),
      });
      setQuote(q);
      setReceipt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare purchase.");
    } finally {
      setBusy(false);
    }
  }
  async function checkPayment() {
    if (previewMode) return;
    const id =
      receipt?.id || pending || localStorage.getItem("shopipal.pending");
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      onComplete(await request<Receipt>(`/api/orders/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check payment.");
    } finally {
      setBusy(false);
    }
  }
  function ask(text: string) {
    if (previewMode || chatting || !text.trim()) return;
    clearError();
    setInput("");
    void sendMessage({ text: text.trim() });
  }
  const visible = products.filter(
    (p) => category === "All finds" || p.category === category,
  );
  return (
    <>
      <div className="announcement">
        <span>Thoughtful finds. Your budget. Your say.</span>
        <span>
          <span className="status-dot" /> PayPal sandbox demo
        </span>
      </div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Shopipal home">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          shopipal<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#collection">The collection</a>
          <a href="#book-store">Book store</a>
          <a href="#how-it-works">How it works</a>
          <Link className="merchant-link" href="/dashboard">
            Merchant studio <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main className="store-main">
        {previewMode ? (
          <p className="notice" id="preview-notice">
            Preview mode · Explore the collection. Checkout and chat open once
            merchant setup is complete.
          </p>
        ) : null}
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <span className="status-dot" /> A MORE THOUGHTFUL WAY TO SHOP
            </span>
            <h1>
              A little help.
              <br />A <em>great find.</em>
            </h1>
            <p>
              Tell us what you’re looking for. We’ll find the good stuff, keep
              your budget in mind, and leave the final decision to you.
            </p>
            <a className="hero-link" href="#collection">
              Explore the collection <ArrowDown size={17} />
            </a>
            <div className="hero-trust">
              <span>
                <Check size={15} /> Within your budget
              </span>
              <span>
                <ShieldCheck size={15} /> Always your approval
              </span>
            </div>
          </div>
          <section className="chat-panel" aria-label="Shopping assistant">
            <div className="chat-header">
              <span className="assistant-mark">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>Your shopping pal</strong>
                <small>
                  <span className="status-dot" /> Here to help you find your
                  thing
                </small>
              </div>
              <span className="chat-label">LET’S FIND IT</span>
            </div>
            <div className="chat-content" aria-live="polite">
              {messages.length === 0 ? (
                <>
                  <span className="eyebrow">LESS SCROLLING. MORE FINDING.</span>
                  <h2>What’s on your wishlist?</h2>
                  <p>
                    Running shoes for your next adventure?
                    <br />
                    An everyday bag that goes everywhere?
                    <br />
                    Just ask. I’ll take a look.
                  </p>
                  <div className="suggestions">
                    {[
                      "Running shoes under $80",
                      "An everyday bag under $50",
                      "Find a printable book from the book store",
                    ].map((s) => (
                      <button
                        key={s}
                        disabled={previewMode}
                        onClick={() => ask(s)}
                      >
                        {s}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                messages.map((m, messageIndex) => {
                  const limits = chatLimits(
                    messages.slice(0, messageIndex + 1),
                    Math.round(budget * 100),
                  );
                  const seen = new Set<string>();
                  function firstMatch(id: string, withinBudget: boolean) {
                    if (!withinBudget || seen.has(id)) return false;
                    seen.add(id);
                    return true;
                  }
                  function renderBooks(
                    books: StoreBook[],
                    key: number | string,
                  ) {
                    return (
                      <div className="chat-matches" key={key}>
                        {books
                          .filter((b) =>
                            firstMatch(
                              b.variantId,
                              b.usdEstimate !== undefined &&
                                b.usdEstimate.cents <= limits.usdCents &&
                                (limits.kesCents === undefined ||
                                  Math.round(Number(b.amount) * 100) <=
                                    limits.kesCents),
                            ),
                          )
                          .map((b) => (
                            <button
                              key={b.variantId}
                              onClick={() => reviewBook(b)}
                            >
                              <span>
                                {b.title}
                                <small>Shopify store · KES</small>
                              </span>
                              <strong>
                                {bookPrice(b)} <ArrowUpRight size={14} />
                              </strong>
                            </button>
                          ))}
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className={`chat-message ${m.role}`}>
                      <span className="eyebrow">
                        {m.role === "user" ? "YOU" : "YOUR PAL"}
                      </span>
                      {m.parts.map((part, i) => {
                        if (part.type === "text")
                          return <p key={i}>{part.text}</p>;
                        if (
                          part.type === "tool-search_store_books" &&
                          "output" in part &&
                          part.state === "output-available"
                        ) {
                          const output = part.output as {
                            products?: StoreBook[];
                          };
                          return renderBooks(output.products || [], i);
                        }
                        if (
                          part.type === "tool-prepare_store_checkout" &&
                          "output" in part &&
                          part.state === "output-available"
                        ) {
                          const b = part.output as StoreBook;
                          if (
                            !b.usdEstimate ||
                            b.usdEstimate.cents > limits.usdCents ||
                            (limits.kesCents !== undefined &&
                              Math.round(Number(b.amount) * 100) >
                                limits.kesCents)
                          )
                            return null;
                          return (
                            <button
                              key={i}
                              className="primary"
                              onClick={() => reviewBook(b)}
                            >
                              Review book: {b.title} <ArrowUpRight size={14} />
                            </button>
                          );
                        }
                        if (
                          part.type === "tool-search_products" &&
                          "output" in part &&
                          part.state === "output-available"
                        ) {
                          const output = part.output as {
                            products?: Product[];
                            books?: StoreBook[];
                          };
                          return (
                            <div key={i}>
                              <div className="chat-matches" key={i}>
                                {output.products
                                  ?.filter((p) =>
                                    firstMatch(
                                      p.id,
                                      p.priceCents <= limits.usdCents,
                                    ),
                                  )
                                  .map((p) => (
                                    <button
                                      key={p.id}
                                      disabled={busy}
                                      onClick={() => void select(p)}
                                    >
                                      <span>
                                        {p.title}
                                        <small>{p.color}</small>
                                      </span>
                                      <strong>
                                        {money(p.priceCents)}{" "}
                                        <ArrowUpRight size={14} />
                                      </strong>
                                    </button>
                                  ))}
                              </div>
                              {renderBooks(output.books || [], `books-${i}`)}
                            </div>
                          );
                        }
                        if (
                          part.type === "tool-prepare_checkout" &&
                          "output" in part &&
                          part.state === "output-available"
                        ) {
                          const q = part.output as PublicQuote;
                          if (q.amountCents > limits.usdCents) return null;
                          return (
                            <button
                              key={i}
                              className="primary"
                              onClick={() => {
                                setQuote(q);
                                setReceipt(null);
                              }}
                            >
                              Review {q.title}
                              <ArrowUpRight size={14} />
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })
              )}
              {chatting ? (
                <p className="thinking">
                  <LoaderCircle size={15} className="spin" /> Looking for a good
                  fit…
                </p>
              ) : null}
              {chatError ? (
                <p role="alert" className="error">
                  {chatError.message}{" "}
                  <button className="text-button" onClick={() => clearError()}>
                    Dismiss
                  </button>
                </p>
              ) : null}
            </div>
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <label className="sr-only" htmlFor="shopping-message">
                What are you looking for?
              </label>
              <input
                id="shopping-message"
                disabled={previewMode}
                aria-describedby={previewMode ? "preview-notice" : undefined}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                placeholder={
                  previewMode
                    ? "Chat opens after store setup"
                    : "Tell me what you have in mind…"
                }
              />
              <button
                disabled={previewMode || chatting || !input.trim()}
                aria-label="Send message"
              >
                <ArrowUp size={20} />
              </button>
            </form>
            <div className="chat-footer">
              <ShieldCheck size={12} /> Your pal can find it. Only you can
              approve it.
            </div>
          </section>
        </section>
        {notice ? (
          <div className="referral-banner">
            <Tag size={16} />
            {notice}
            {ref ? (
              <button
                className="text-button"
                onClick={() => {
                  setRef("");
                  setNotice("Referral removed.");
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <div className="notice error" role="alert">
            {error}
          </div>
        ) : null}
        {busy ? (
          <p className="busy-indicator" role="status">
            <LoaderCircle size={16} className="spin" /> One moment…
          </p>
        ) : null}
        {pending ? (
          <div className="notice">
            <span>You have a recent checkout.</span>{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void checkPayment()}
            >
              Check payment status <ArrowUpRight size={14} />
            </button>
          </div>
        ) : null}
        <BookStore onReview={reviewBook} />
        <section id="collection" className="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SMALL COLLECTION. GOOD CHOICES.</span>
              <h2>
                Meet your next favorite<span>.</span>
              </h2>
            </div>
            <p>Everyday essentials, a little more considered.</p>
          </div>
          <div className="collection-toolbar">
            <div
              className="category-tabs"
              role="group"
              aria-label="Product category"
            >
              {["All finds", "Footwear", "Carry", "Essentials"].map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="budget-control">
              My budget <span>$</span>
              <input
                aria-label="Budget in dollars"
                type="number"
                min="1"
                max="80"
                value={budget}
                onChange={(e) =>
                  setBudget(
                    Math.max(1, Math.min(80, Number(e.target.value) || 1)),
                  )
                }
              />
              <span>USD</span>
            </label>
          </div>
          {loading ? (
            <p className="empty-state">Gathering the good finds…</p>
          ) : visible.length ? (
            <div className="product-grid">
              {visible.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  disabled={previewMode}
                  onSelect={(p) => void select(p)}
                />
              ))}
            </div>
          ) : (
            <p className="empty-state">
              The collection isn’t available yet. Run the database setup and
              refresh.
            </p>
          )}
          <p className="collection-note">
            Sample collection · reference photographs show similar market
            products, not confirmed inventory. Checkout remains PayPal sandbox.
            Store books above use their actual Shopify listings.
          </p>
        </section>
        <section className="how-section" id="how-it-works">
          <div>
            <span className="eyebrow">A LITTLE LESS FRICTION</span>
            <h2>
              Good shopping.
              <br />
              On your terms.
            </h2>
          </div>
          <div className="how-step">
            <MessageCircle size={24} />
            <span>01 / TELL US</span>
            <h3>Start with a thought.</h3>
            <p>
              A need, a budget, a favorite color. Your pal does the searching.
            </p>
          </div>
          <div className="how-step">
            <Compass size={24} />
            <span>02 / FIND YOUR FIT</span>
            <h3>Consider the good ones.</h3>
            <p>A few thoughtful matches. Clear prices. No endless scrolling.</p>
          </div>
          <div className="how-step">
            <ShieldCheck size={24} />
            <span>03 / MAKE IT YOURS</span>
            <h3>You have the final say.</h3>
            <p>
              Review every detail. Approve your choice. Pay with PayPal sandbox.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Link className="brand" href="/">
          shopipal.
        </Link>
        <p>A little help goes a long way.</p>
        <span>PayPal demo · Sandbox only. Book store · Shopify checkout.</span>
        <a
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Rates By Exchange Rate API
        </a>
      </footer>
      {book ? (
        <PurchaseDialog onClose={closePanel}>
          <StoreBookReview
            key={book.variantId}
            book={book}
            onClose={closePanel}
            onPayPalQuote={(q) => {
              setBook(null);
              setReceipt(null);
              setQuote(q);
            }}
          />
        </PurchaseDialog>
      ) : null}
      {quote || receipt ? (
        <PurchaseDialog onClose={closePanel}>
          {quote ? (
            <ApprovalCard
              key={quote.id}
              quote={quote}
              onClose={() => setQuote(null)}
              onComplete={onComplete}
            />
          ) : receipt ? (
            <ReceiptCard
              receipt={receipt}
              onClose={() => setReceipt(null)}
              onCheck={() => void checkPayment()}
            />
          ) : null}
        </PurchaseDialog>
      ) : null}
    </>
  );
}
