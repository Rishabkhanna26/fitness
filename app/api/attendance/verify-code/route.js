import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { verifyAndMarkAttendance } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session?.memberId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const result = await verifyAndMarkAttendance(session.memberId, code);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, totalVisits: result.totalVisits });
}
