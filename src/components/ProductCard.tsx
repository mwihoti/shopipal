import { productPhoto } from "@/lib/product-photos";
import Image from "next/image";
import { ArrowUpRight, Plus } from "lucide-react";
import { money } from "@/lib/money";
import type { Product } from "@/lib/schema";
export function ProductCard({
  product,
  onSelect,
  compact = false,
  disabled = false,
}: {
  product: Product;
  onSelect: (p: Product) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const photo = productPhoto(product.id);
  const reference = photo?.image === product.image;
  return (
    <article className={`product-card ${compact ? "compact" : ""}`}>
      <button
        disabled={disabled}
        className="product-image"
        onClick={() => onSelect(product)}
        aria-label={`Review ${product.title}`}
      >
        <Image
          src={product.image}
          alt={
            reference
              ? `Reference photograph for ${product.title}; sample product`
              : `${product.title} in ${product.color}`
          }
          width={320}
          height={280}
        />
        {reference ? (
          <span className="reference-badge">Reference photo</span>
        ) : null}
        <span className="product-open">
          <ArrowUpRight size={17} />
        </span>
      </button>
      <div className="product-details">
        <span className="eyebrow">
          {product.category} <span>· {product.color}</span>
        </span>
        <div className="product-title">
          <h3>{product.title}</h3>
          <strong>{money(product.priceCents)}</strong>
        </div>
        <p>{product.description}</p>
        {reference ? (
          <a
            className="photo-credit"
            href={photo.source}
            target="_blank"
            rel="noopener noreferrer"
          >
            Photo: Pexels · sample item
          </a>
        ) : null}
        <button
          className="text-button"
          disabled={disabled}
          onClick={() => onSelect(product)}
        >
          {disabled ? "Checkout unavailable in preview" : "Review item"}{" "}
          <Plus size={14} />
        </button>
      </div>
    </article>
  );
}
