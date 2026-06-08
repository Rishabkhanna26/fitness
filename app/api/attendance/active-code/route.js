import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { hasValidAttendanceCode } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.memberId) {
    return NextResponse.json({ code: null });
  }
  const record = await hasValidAttendanceCode(session.memberId);
  if (!record) return NextResponse.json({ code: null });
  return NextResponse.json({ code: record.code, expiresAt: record.expires_at });
}
