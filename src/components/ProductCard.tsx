import Image from 'next/image';
import { ArrowUpRight,Plus } from 'lucide-react';
import { money } from '@/lib/money';
import type { Product } from '@/lib/schema';
export function ProductCard({product,onSelect,compact=false}:{product:Product;onSelect:(p:Product)=>void;compact?:boolean}) {
 return <article className={`product-card ${compact?'compact':''}`}>
  <button className="product-image" onClick={()=>onSelect(product)} aria-label={`Review ${product.title}`}><Image src={product.image} alt={`${product.title} in ${product.color}`} width={320} height={280}/><span className="product-open"><ArrowUpRight size={17}/></span></button>
  <div className="product-details"><span className="eyebrow">{product.category} <span>· {product.color}</span></span><div className="product-title"><h3>{product.title}</h3><strong>{money(product.priceCents)}</strong></div><p>{product.description}</p><button className="text-button" onClick={()=>onSelect(product)}>Review item <Plus size={14}/></button></div>
 </article>;
}
