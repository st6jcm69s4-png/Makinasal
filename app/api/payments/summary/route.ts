import {NextRequest,NextResponse} from "next/server";
import {authRequest} from "@/lib/authRequest";
import {paymentsReady,paymentEnvironment} from "@/lib/iyzico";
import {paymentAdmin} from "@/lib/paymentServer";
import {UUID,toMinor} from "@/lib/paymentRules";
export async function GET(request:NextRequest){const response=NextResponse.json({});const db=authRequest(request,response);const {data}=await db.auth.getUser();if(!data.user)return NextResponse.json({error:'Önce giriş yap.'},{status:401});const quoteId=request.nextUrl.searchParams.get('teklif')||'';if(!UUID.test(quoteId))return NextResponse.json({error:'Ödeme için seçilmiş bir teklif aç.'},{status:400});
const {data:q,error}=await db.from('market_quotes').select('id,post_id,owner_id,bidder_id,display_name,note,amount,price_unit,status').eq('id',quoteId).eq('owner_id',data.user.id).maybeSingle();if(error||!q||q.status!=='accepted'||q.price_unit!=='toplam')return NextResponse.json({error:'Yalnızca seçtiğin ve toplam bedeli belirlenmiş teklif ödenebilir.'},{status:403});
const {data:post}=await db.from('market_posts').select('title,city,district').eq('id',q.post_id).maybeSingle();let merchantReady=false;if(paymentsReady()){const {data:m}=await paymentAdmin().from('payment_merchants').select('approved').eq('user_id',q.bidder_id).maybeSingle();merchantReady=!!m?.approved;}
return NextResponse.json({quoteId:q.id,title:post?.title??'Kabul edilen teklif',seller:q.display_name,note:q.note,city:post?.city??'',amountMinor:toMinor(q.amount),currency:'TRY',available:paymentsReady()&&merchantReady,environment:paymentEnvironment(),verified:!!data.user.email_confirmed_at&&!!data.user.phone_confirmed_at},{headers:{'Cache-Control':'no-store'}});}
