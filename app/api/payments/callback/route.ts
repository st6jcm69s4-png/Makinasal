import {readBoundedText} from "@/lib/http";
import {NextRequest,NextResponse} from "next/server";
import {confirmCheckout} from "@/lib/paymentServer";
import {UUID} from "@/lib/paymentRules";
export async function POST(request:NextRequest){const order=request.nextUrl.searchParams.get('order')||'';if(!UUID.test(order))return new NextResponse('Geçersiz sipariş',{status:400});try{const raw=await readBoundedText(request,8192);if(raw.length>8192)throw new Error();const token=new URLSearchParams(raw).get('token');if(!token||token.length>500)throw new Error();await confirmCheckout(order,token,'callback');}catch{return new NextResponse('Ödeme doğrulanamadı; Ödemelerim ekranından kontrol et.',{status:503,headers:{'Cache-Control':'no-store'}});}const target=new URL('/odeme',request.url);target.searchParams.set('order',order);return NextResponse.redirect(target,303);}
