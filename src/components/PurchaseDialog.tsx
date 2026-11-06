'use client';
import { useEffect,useRef } from 'react';
export function PurchaseDialog({children,onClose}:{children:React.ReactNode;onClose:()=>void}) {
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  container.current?.focus();
  function keydown(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const elements=container.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),iframe,[tabindex="0"]');
    if(!elements?.length)return;
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===container.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===container.current)){event.preventDefault();first.focus();}
   }
  }
  document.addEventListener('keydown',keydown);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previous?.focus();};
 },[onClose]);
 return <div className="review-overlay" role="dialog" aria-modal="true" aria-label="Purchase details" ref={container} tabIndex={-1}><button className="review-backdrop" tabIndex={-1} aria-label="Close purchase panel" onClick={onClose}/>{children}</div>;
}
