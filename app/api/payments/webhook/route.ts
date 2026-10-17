import {readBoundedText} from "@/lib/http";
import {NextRequest,NextResponse} from "next/server";
import {verifyHostedWebhook} from "@/lib/iyzico";
import {confirmCheckout} from "@/lib/paymentServer";
import {UUID} from "@/lib/paymentRules";
export async function POST(request:NextRequest){const secret=process.env.IYZICO_SECRET_KEY;if(!secret)return new NextResponse('Unavailable',{status:503});try{const raw=await readBoundedText(request,16000);if(raw.length>16000)return new NextResponse('Bad request',{status:400});const body=JSON.parse(raw);if(!await verifyHostedWebhook(body,request.headers.get('x-iyz-signature-v3')||'',secret)||!UUID.test(body.paymentConversationId))return new NextResponse('Unauthorized',{status:401});await confirmCheckout(body.paymentConversationId,String(body.token),`webhook:${body.iyziPaymentId}:${body.status}`);return NextResponse.json({received:true});}catch{return new NextResponse('Retry later',{status:503});}}
