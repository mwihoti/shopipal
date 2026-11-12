"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { request } from "@/lib/client";
import { STORE_URL, bookPrice, type StoreBook } from "@/lib/store-types";

export function StoreBookCard({
  book,
  onReview,
}: {
  book: StoreBook;
  onReview: (book: StoreBook) => void;
}) {
  return (
    <article className="store-book-card">
      <button
        className="store-book-cover"
        onClick={() => onReview(book)}
        aria-label={`Review book ${book.title}`}
      >
        {book.image ? (
          <Image
            src={book.image}
            alt={book.title}
            width={240}
            height={310}
            unoptimized
          />
        ) : (
          <span>PDF</span>
        )}
      </button>
      <div className="store-book-details">
        <span className="eyebrow">PDF-COLOR GAME · SHOPIFY</span>
        <h3>{book.title}</h3>
        {book.variantTitle ? <p>{book.variantTitle}</p> : null}
        <p>
          {book.description.slice(0, 180)}
          {book.description.length > 180 ? "…" : ""}
        </p>
        <strong>{bookPrice(book)}</strong>
        <button className="text-button" onClick={() => onReview(book)}>
          Review book <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}
export function BookStore({
  onReview,
}: {
  onReview: (book: StoreBook) => void;
}) {
  const [books, setBooks] = useState<StoreBook[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let active = true;
    request<{ products: StoreBook[]; hasMore: boolean }>("/api/store/books")
      .then((data) => {
        if (active) {
          setBooks(data.products);
          setHasMore(data.hasMore);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "The book collection is temporarily unavailable. You can still visit the store.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      className="book-store collection"
      id="book-store"
      aria-label="Book store"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">FROM PDF-COLOR GAME</span>
          <h2>A little time for a good book.</h2>
        </div>
        <a
          href={STORE_URL}
          className="text-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit the store <ArrowUpRight size={16} />
        </a>
      </div>
      <p className="store-description">
        Browse the store’s printable books, or ask your pal to find one. Prices
        are in Kenyan shillings (KES). You review and pay at Shopify checkout
        using the store’s payment settings.
      </p>
      <p className="collection-note">
        Ask in USD or KES. Your pal compares book prices with dollar budgets
        using an estimated exchange rate. Shopify charges in KES; final
        conversion and payment fees can differ. Store purchases and digital
        delivery are managed in Shopify.
      </p>
      {loading ? (
        <p role="status">Loading books from the store…</p>
      ) : error ? (
        <p role="status">{error}</p>
      ) : books.length ? (
        <div className="store-book-grid">
          {books.map((book) => (
            <StoreBookCard
              key={book.variantId}
              book={book}
              onReview={onReview}
            />
          ))}
        </div>
      ) : (
        <p>
          No published books are available right now. Check the store for
          updates.
        </p>
      )}
      {hasMore ? (
        <p className="collection-note">
          Showing the first 30 matching products. Visit the store to browse
          more.
        </p>
      ) : null}
    </section>
  );
}
export function StoreBookReview({
  book,
  onClose,
}: {
  book: StoreBook;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const result = await request<{ checkoutUrl: string }>(
        "/api/store/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            variantId: book.variantId,
            expectedAmount: book.amount,
            currency: book.currency,
            approved: true,
            ...(book.maxUsdCents === undefined
              ? {}
              : { maxUsdCents: book.maxUsdCents }),
          }),
        },
      );
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(false);
    }
  }
  return (
    <aside className="review-panel" aria-label="Book purchase review">
      <div className="panel-header">
        <span className="eyebrow">SHOPIFY STORE CHECKOUT</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close book review"
        >
          <X size={19} />
        </button>
      </div>
      <h2>Your next good read.</h2>
      <h3>{book.title}</h3>
      {book.variantTitle ? <p>{book.variantTitle}</p> : null}
      <p>{book.description}</p>
      <dl className="review-list">
        <div>
          <dt>Store</dt>
          <dd>pdf-color game</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>1</dd>
        </div>
        <div>
          <dt>Book price</dt>
          <dd>{bookPrice(book)}</dd>
        </div>
      </dl>
      {book.usdEstimate ? (
        <p className="tiny muted">
          Estimated at 1 USD = {book.usdEstimate.kesPerUsd.toFixed(4)} KES. Rate
          updated{" "}
          {new Date(book.usdEstimate.updatedAt).toISOString().slice(0, 10)} UTC.{" "}
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rates By Exchange Rate API
          </a>
          . This is an estimate; checkout conversion and fees may differ.
        </p>
      ) : null}
      <p className="muted">
        You’re leaving the PayPal sandbox demo for the store’s Shopify checkout.
        Its payment settings apply and may charge real money. Review the final
        total, taxes, and payment method there before paying.
      </p>
      <p className="tiny muted">
        This creates a cart only. Your pal cannot pay for you. Shopify purchases
        will appear in the store’s order admin; this demo dashboard tracks
        sandbox orders only.
      </p>
      <a
        href={book.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-button"
      >
        Read the store listing <ArrowUpRight size={14} />
      </a>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      <button
        className="primary wide"
        disabled={busy}
        onClick={() => void checkout()}
      >
        {busy ? "Preparing checkout…" : "I approve · Continue to Shopify"}
        <ArrowUpRight size={17} />
      </button>
    </aside>
  );
}
