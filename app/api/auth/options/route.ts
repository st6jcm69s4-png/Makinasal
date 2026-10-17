import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/authOptions";
export async function GET() { try { return NextResponse.json(await getAuthOptions(), { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ error: "Hesap hizmeti şu anda kullanılamıyor." }, { status: 503, headers: { "Cache-Control": "no-store" } }); } }
