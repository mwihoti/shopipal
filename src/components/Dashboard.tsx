'use client';
import { useEffect,useState,useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft,RefreshCw,LogOut,ShieldCheck,ShoppingBag,Tag,Wallet } from 'lucide-react';
import { request } from '@/lib/client';
import { money } from '@/lib/money';
import type { DashboardOrder } from './OrdersGrid';
const OrdersGrid=dynamic(()=>import('./OrdersGrid'),{ssr:false,loading:()=> <p className="empty-state">Preparing the order table…</p>});
export function Dashboard(){
 const [orders,setOrders]=useState<DashboardOrder[]>([]),[authenticated,setAuthenticated]=useState(false),[passphrase,setPassphrase]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const r=await request<{orders:DashboardOrder[]}>('/api/dashboard');setOrders(r.orders);setAuthenticated(true);}
  catch(e){setError(e instanceof Error?e.message:'Could not load orders.');setAuthenticated(false);}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function login(e:React.FormEvent){e.preventDefault();setLoading(true);setError('');try{await request('/api/dashboard/login',{method:'POST',body:JSON.stringify({passphrase})});setPassphrase('');await load();}catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');setLoading(false);}}
 async function logout(){try{await request('/api/dashboard/logout',{method:'POST'});setAuthenticated(false);setOrders([]);}catch(e){setError(e instanceof Error?e.message:'Sign-out failed.');}}
 const completed=orders.filter(o=>o.status==='COMPLETED');
 return <main className="dashboard-main"><a href="/" className="back-link"><ArrowLeft size={15}/> Back to the collection</a><header className="dashboard-heading"><div><span className="eyebrow">SHOPIPAL / MERCHANT STUDIO</span><h1>A view of the good things.</h1><p>Your latest 500 sandbox orders and creator commissions, in one place.</p></div>{authenticated?<div className="dashboard-actions"><button className="secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="icon-button" onClick={()=>void logout()} aria-label="Sign out"><LogOut size={19}/></button></div>:null}</header>
 {!authenticated?<form className="login-card" onSubmit={e=>void login(e)}><ShieldCheck size={30}/><h2>For the merchant.</h2><p>Enter the demo merchant passphrase to view orders.</p><label htmlFor="passphrase">Merchant passphrase</label><input id="passphrase" type="password" autoComplete="current-password" required maxLength={200} value={passphrase} onChange={e=>setPassphrase(e.target.value)}/><button className="primary wide" disabled={loading}>{loading?'Checking…':'Open merchant studio'}</button>{error?<p role="alert" className="error">{error}</p>:null}</form>:<>{error?<p className="error" role="alert">{error}</p>:null}<div className="stat-grid"><div><ShoppingBag size={20}/><span>Completed purchases</span><strong>{completed.length}</strong></div><div><Wallet size={20}/><span>Captured volume</span><strong>{money(completed.reduce((s,o)=>s+o.amount_cents,0))}</strong></div><div><Tag size={20}/><span>Creator commission owed</span><strong>{money(completed.reduce((s,o)=>s+o.commission_cents,0))}</strong></div></div><div className="dashboard-table-heading"><h2>Order activity</h2><span><span className="status-dot"/> SANDBOX ONLY</span></div><OrdersGrid orders={orders}/><p className="tiny muted">Commissions are recorded after completed captures. Creator payouts are not enabled.</p></>}
 </main>;
}
