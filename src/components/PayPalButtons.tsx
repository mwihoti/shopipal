'use client';
import { useEffect,useRef,useState } from 'react';
import { request,RequestError } from '@/lib/client';
import type { Receipt } from '@/lib/orders';
type Actions={restart:()=>Promise<void>};
type Buttons={render:(element:HTMLElement)=>Promise<void>;close:()=>Promise<void>};
declare global { interface Window { paypal?:{Buttons:(options:{createOrder:()=>Promise<string>;onApprove:(data:{orderID:string},actions:Actions)=>Promise<void>;onCancel:()=>void;onError:()=>void;style:Record<string,string>})=>Buttons} } }
let sdk:Promise<void>|undefined;
function loadSdk(clientId:string) {
 if(window.paypal) return Promise.resolve();
 if(!sdk) sdk=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&disable-funding=card,credit,paylater,venmo`;
  script.onload=()=>resolve();script.onerror=()=>{script.remove();sdk=undefined;reject(new Error('PayPal could not load. Check your connection and retry.'));};document.head.appendChild(script);
 });
 return sdk;
}
export function PayPalButtons({quoteId,onComplete}:{quoteId:string;onComplete:(r:Receipt)=>void}) {
 const container=useRef<HTMLDivElement>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let cancelled=false;let buttons:Buttons|undefined;let orderId:string|undefined;
  const clientId=process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if(!clientId) return;
  loadSdk(clientId).then(async()=>{
   if(cancelled||!container.current||!window.paypal) return;
   buttons=window.paypal.Buttons({style:{layout:'vertical',color:'gold',shape:'rect',label:'paypal'},
    createOrder:async()=>{
     setError('');const order=await request<{orderId:string;paypalOrderId:string}>('/api/orders',{method:'POST',body:JSON.stringify({quoteId,approved:true})});
     orderId=order.orderId;localStorage.setItem('shopipal.pending',orderId);return order.paypalOrderId;
    },
    onApprove:async(_data,actions)=>{
     if(!orderId) return;
     try{const result=await request<Receipt>(`/api/orders/${orderId}/capture`,{method:'POST'});onComplete(result);if(result.status==='COMPLETED')localStorage.removeItem('shopipal.pending');}
     catch(e){if(e instanceof RequestError&&e.code==='INSTRUMENT_DECLINED'){setError('Choose another funding source.');await actions.restart();}else setError(e instanceof Error?e.message:'Payment status is uncertain. Use Check payment status below.');}
    },
    onCancel:()=>setError('Checkout cancelled. No new payment was requested.'),onError:()=>setError('PayPal checkout could not finish. Retry or check payment status.'),
   });
   await buttons.render(container.current);if(!cancelled)setLoading(false);
  }).catch(e=>{if(!cancelled){setLoading(false);setError(e.message);}});
  return()=>{cancelled=true;void buttons?.close();};
 },[quoteId,onComplete]);
 if(!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) return <p className="notice">PayPal setup required: add the sandbox client ID to enable checkout.</p>;
 return <><div ref={container} className="paypal-buttons"/>{loading?<p className="muted">Loading secure checkout…</p>:null}{error?<p role="alert" className="error">{error}</p>:null}</>;
}
