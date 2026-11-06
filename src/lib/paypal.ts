import { AppError, required, sandbox } from './config';
import { decimal } from './money';
import type { Quote } from './schema';
const base='https://api-m.sandbox.paypal.com';
export type PayPalOrder={id:string;status:string;purchase_units:Array<{payee?:{merchant_id?:string;email_address?:string};amount:{currency_code:string;value:string};payments?:{captures?:Array<{id:string;status:string;amount:{currency_code:string;value:string}}>} }>};
async function token() {
 sandbox();
 const response=await fetch(`${base}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${required('PAYPAL_CLIENT_ID')}:${required('PAYPAL_CLIENT_SECRET')}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok) throw new AppError(502,'PayPal authentication failed. Check sandbox credentials.');
 return (await response.json()).access_token as string;
}
async function call(path:string, method='GET', payload?:unknown, key?:string):Promise<PayPalOrder> {
 const response=await fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${await token()}`,'Content-Type':'application/json',...(key?{'PayPal-Request-Id':key}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok){
  const issue=data.details?.[0]?.issue;
  if(issue==='INSTRUMENT_DECLINED') throw new AppError(422,'Choose another PayPal funding source.','INSTRUMENT_DECLINED');
  console.error(JSON.stringify({event:'paypal_error',status:response.status,issue,debugId:data.debug_id}));
  throw new AppError(502,'PayPal could not complete this request. Retry to check its status.','PAYPAL_ERROR');
 }
 return data;
}
export function createPayPalOrder(q:Quote,key:string) {
 return call('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{reference_id:q.id,custom_id:q.referral_code?`ref:${q.referral_code}`:'direct',description:q.title,amount:{currency_code:'USD',value:decimal(q.amount_cents)}}],payment_source:{paypal:{experience_context:{shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW'}}}},`create-${key}`);
}
export const getPayPalOrder=(id:string)=>call(`/v2/checkout/orders/${encodeURIComponent(id)}`);
export const capturePayPalOrder=(id:string,key:string)=>call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`,'POST',{},`capture-${key}`);
export function verifyAmount(order:PayPalOrder,cents:number) {
 const units=order.purchase_units;
 if(units?.length!==1||units[0].amount.currency_code!=='USD'||units[0].amount.value!==decimal(cents)) throw new AppError(409,'PayPal order amount does not match your approved purchase.');
}
