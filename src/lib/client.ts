export class RequestError extends Error { constructor(message:string,public code?:string){super(message);} }
export async function request<T>(url:string,options?:RequestInit):Promise<T> {
 const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options?.headers}});
 const data=await response.json();
 if(!response.ok) throw new RequestError(data.error||'Request failed. Please retry.',data.code);
 return data;
}
