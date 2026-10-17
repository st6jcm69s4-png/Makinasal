import {createClient} from "@supabase/supabase-js";
import {iyzicoRequest} from "./iyzico";
import {toMinor,paymentResultStatus} from "./paymentRules";
export function paymentAdmin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Ödeme hizmeti kullanılamıyor');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function confirmCheckout(orderId:string,token:string,eventKey:string){const db=paymentAdmin();const {data:order,error}=await db.from('payment_orders').select('*').eq('id',orderId).single();if(error||!order||order.provider_token!==token)throw new Error('Sipariş eşleşmiyor');
const result=await iyzicoRequest('/payment/iyzipos/checkoutform/auth/ecom/detail',{locale:'tr',conversationId:order.id,token});
if(result.conversationId!==order.id||result.basketId!==order.id||result.currency!=='TRY'||toMinor(result.price)!==Number(order.amount_minor)||toMinor(result.paidPrice)!==Number(order.amount_minor)||!result.paymentId||result.token!==token)throw new Error('Ödeme ayrıntıları eşleşmiyor');
const status=paymentResultStatus(result),transaction=result.itemTransactions?.find((x:{itemId:string})=>x.itemId===order.quote_id);
if(status==='paid'&&!transaction?.paymentTransactionId)throw new Error('Ödeme kalemi bulunamadı');
const {error:recordError}=await db.rpc('record_payment_result',{p_order:order.id,p_amount:order.amount_minor,p_currency:'TRY',p_status:status,p_payment:String(result.paymentId),p_transaction:transaction?.paymentTransactionId?String(transaction.paymentTransactionId):null,p_event:order.id+':'+eventKey+':'+String(result.paymentId)+':'+status});if(recordError)throw new Error('Ödeme kaydedilemedi');return status;
}
