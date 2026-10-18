import {readApiJson} from './http';
import {safeHostedPaymentUrl} from "./paymentRules";
const encode=new TextEncoder();
export async function hmacHex(secret:string,value:string){const key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encode.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function iyzicoAuthorization(apiKey:string,secret:string,random:string,path:string,body:string){const signature=await hmacHex(secret,random+path+body);return 'IYZWSv2 '+btoa(`apiKey:${apiKey}&randomKey:${random}&signature:${signature}`);}
export function paymentEnvironment(){return process.env.IYZICO_ENVIRONMENT==='live'?'live':'sandbox';}
export function paymentsReady(){return process.env.PAYMENTS_ENABLED==='true'&&process.env.IYZICO_MARKETPLACE_APPROVED==='true'&&!!process.env.IYZICO_API_KEY&&!!process.env.IYZICO_SECRET_KEY&&!!process.env.SUPABASE_SERVICE_ROLE_KEY&&(paymentEnvironment()==='sandbox'||process.env.PAYMENTS_LIVE_APPROVED==='true');}
export async function iyzicoRequest(path:string,payload:Record<string,unknown>){const apiKey=process.env.IYZICO_API_KEY,secret=process.env.IYZICO_SECRET_KEY;if(!apiKey||!secret)throw new Error('Ödeme hizmeti kullanılamıyor');const random=crypto.randomUUID(),body=JSON.stringify(payload),base=paymentEnvironment()==='live'?'https://api.iyzipay.com':'https://sandbox-api.iyzipay.com';
const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:await iyzicoAuthorization(apiKey,secret,random,path,body),'x-iyzi-rnd':random},body,signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Ödeme sonucu alınamadı');return parseIyzicoResult(await readApiJson<Record<string,unknown>>(response));}
export async function verifyHostedWebhook(body:Record<string,unknown>,signature:string,secret:string){if(!/^[a-f0-9]{64}$/i.test(signature)||body.iyziEventType!=='CHECKOUT_FORM_AUTH')return false;const values=['iyziEventType','iyziPaymentId','token','paymentConversationId','status'];if(values.some(k=>typeof body[k]!=='string'&&typeof body[k]!=='number'))return false;const expected=await hmacHex(secret,secret+values.map(k=>String(body[k])).join(''));let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);return diff===0;}
export function hostedCheckoutUrl(value:string,token:string){const url=safeHostedPaymentUrl(value,paymentEnvironment());return url&&new URL(url).searchParams.get('token')===token?url:null;}

export type IyzicoResult = {
 status?: string; conversationId?: string; basketId?: string; currency?: string;
 price?: string | number; paidPrice?: string | number; paymentId?: string | number;
 token?: string; paymentPageUrl?: string; paymentStatus?: string; fraudStatus?: number;
 itemTransactions?: { itemId: string; paymentTransactionId?: string | number }[];
};
export function parseIyzicoResult(value: Record<string, unknown>): IyzicoResult {
 for (const key of ['status','conversationId','basketId','currency','token','paymentPageUrl','paymentStatus']) {
  if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('Ödeme yanıtı doğrulanamadı.');
 }
 for (const key of ['price','paidPrice','paymentId']) {
  if (value[key] !== undefined && typeof value[key] !== 'string' && typeof value[key] !== 'number') throw new Error('Ödeme yanıtı doğrulanamadı.');
 }
 if (value.fraudStatus !== undefined && (typeof value.fraudStatus !== 'number' || !Number.isFinite(value.fraudStatus))) throw new Error('Ödeme yanıtı doğrulanamadı.');
 if (value.itemTransactions !== undefined && (!Array.isArray(value.itemTransactions) || value.itemTransactions.some(item => !item || typeof item !== 'object' || typeof item.itemId !== 'string' || (item.paymentTransactionId !== undefined && typeof item.paymentTransactionId !== 'string' && typeof item.paymentTransactionId !== 'number')))) throw new Error('Ödeme kalemleri doğrulanamadı.');
 return value as IyzicoResult;
}
