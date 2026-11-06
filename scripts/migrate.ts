import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
config({path:'.env.local', quiet:true});
const { database } = await import('../src/lib/db');
const db = database();
const sql = await readFile(new URL('../data/schema.sql', import.meta.url), 'utf8');
await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean), 'write');
console.log('Database schema ready.');
db.close();
