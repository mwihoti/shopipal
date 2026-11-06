import { dashboardAuth } from '@/lib/dashboard-auth';
import { database } from '@/lib/db';
import { failure,json } from '@/lib/http';
export async function GET() {
 try {
  await dashboardAuth();
  const r=await database().execute(`SELECT o.id,o.paypal_order_id,o.paypal_capture_id,o.status,o.created_at,o.captured_at,o.commission_cents,q.title,q.amount_cents,q.referral_code FROM orders o JOIN quotes q ON q.id=o.quote_id ORDER BY o.created_at DESC LIMIT 500`);
  return json({orders:r.rows});
 }catch(e){return failure(e);}
}
