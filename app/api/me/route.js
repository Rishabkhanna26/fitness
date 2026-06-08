import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { getMemberById } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role === "admin") return NextResponse.json({ session });

  const member = await getMemberById(session.memberId);
  return NextResponse.json({ session, member });
}
