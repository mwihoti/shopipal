import { database } from '@/lib/db';
import { required,sandbox,capCents } from '@/lib/config';
import { json } from '@/lib/http';
export async function GET() {
 try {
  sandbox();capCents();['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','NEXT_PUBLIC_PAYPAL_CLIENT_ID','OPENROUTER_API_KEY','OPENROUTER_MODEL','DASHBOARD_PASSPHRASE','SESSION_SECRET'].forEach(required);
  await database().execute('SELECT id FROM products LIMIT 1');
  return json({status:'ready',environment:'sandbox'});
 }catch{return json({status:'setup_required',environment:'sandbox'},503);}
}
