import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products', {
 id: text('id').primaryKey(), title: text('title').notNull(), description: text('description').notNull(),
 category: text('category').notNull(), priceCents: integer('price_cents').notNull(), image: text('image').notNull(),
 color: text('color').notNull(), available: integer('available', {mode:'boolean'}).notNull(), tags: text('tags').notNull(),
});
export type Product = typeof products.$inferSelect;
export type Quote = {
 id:string; session_id:string; product_id:string; title:string; amount_cents:number; currency:string;
 budget_cents:number; merchant:string; referral_code:string|null; commission_bps:number;
 expires_at:number; approved_at:number|null;
};
export type Order = {
 id:string; quote_id:string; session_id:string; paypal_order_id:string|null; paypal_capture_id:string|null; paypal_merchant_id:string|null;
 status:string; created_at:number; captured_at:number|null; commission_cents:number; lease_until:number;
};
