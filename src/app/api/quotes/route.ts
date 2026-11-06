import { z } from 'zod';
import { body,sameOrigin,failure,json } from '@/lib/http';
import { session,guardRate } from '@/lib/session';
import { prepareQuote } from '@/lib/quotes';
export async function POST(request:Request) {
 try {
  sameOrigin(request); const id=await session(); await guardRate(request,id,'quote');
  const b=await body(request,z.object({productId:z.string().max(80),budgetCents:z.number().int().positive().max(8000),ref:z.string().max(40).optional()}));
  return json(await prepareQuote(id,b.productId,b.budgetCents,b.ref));
 }catch(e){return failure(e);}
}
