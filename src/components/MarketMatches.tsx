import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { money } from "@/lib/money";
import { publicHttpsUrl, type MarketProduct } from "@/lib/market-types";

export function MarketMatches({ products }: { products: MarketProduct[] }) {
  if (!products.length) return null;
  return (
    <div className="market-matches">
      <span className="eyebrow">From retailers · powered by Channel3</span>
      {products.map((product) => (
        <a
          key={product.id}
          className="market-match"
          href={product.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          {product.image && publicHttpsUrl(product.image) ? (
            <Image
              src={product.image}
              alt={product.title}
              width={72}
              height={80}
              unoptimized
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span>
            <strong>{product.title}</strong>
            <small>{product.retailer}</small>
            <b>{money(product.priceCents)}</b>
            <small>
              View at retailer <ArrowUpRight size={12} />
            </small>
          </span>
        </a>
      ))}
      <p className="market-note">
        Checkout is at the retailer. Shipping, taxes and currency fees may
        increase the total; confirm delivery to your country there.
      </p>
    </div>
  );
}
