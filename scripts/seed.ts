import { config } from 'dotenv';
config({path:'.env.local', quiet:true});
const { orm, database } = await import('../src/lib/db');
const { products } = await import('../src/lib/schema');
const catalog = (await import('../data/catalog.json')).default;
await orm().insert(products).values(catalog).onConflictDoNothing();
await database().batch([
 {sql:'INSERT OR IGNORE INTO creators(code,display_name,commission_bps) VALUES (?,?,?)',args:['alice','Alice',1500]},
 {sql:'INSERT OR IGNORE INTO creators(code,display_name,commission_bps) VALUES (?,?,?)',args:['bob','Bob',1000]},
], 'write');
console.log('Seeded 12 products and two referral offers.');
database().close();
