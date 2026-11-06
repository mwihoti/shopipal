import { eq } from 'drizzle-orm';
import { orm } from './db';
import { products } from './schema';
export async function getProduct(id:string) { return (await orm().select().from(products).where(eq(products.id,id)).limit(1))[0]; }
export async function searchProducts(query='', maxCents=Number.MAX_SAFE_INTEGER) {
 const all = await orm().select().from(products).where(eq(products.available,true));
 const words = query.toLowerCase().split(/\W+/).filter(w=>w.length>2 && !['find','under','dollars','want','some','please','with','looking','budget','need','pair','the','for','and'].includes(w));
 return all.filter(p=>p.priceCents<=maxCents).map(p=>({p,score:words.reduce((s,w)=>s+Number(`${p.title} ${p.description} ${p.tags} ${p.category} ${p.color}`.toLowerCase().includes(w.replace(/s$/,''))),0)}))
 .filter(x=>!words.length||x.score>0).sort((a,b)=>b.score-a.score||a.p.priceCents-b.p.priceCents).map(x=>x.p);
}
