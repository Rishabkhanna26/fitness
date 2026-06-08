import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { hasTodayAttendance } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.memberId) {
    return NextResponse.json({ marked: false });
  }
  const marked = await hasTodayAttendance(session.memberId);
  return NextResponse.json({ marked });
}
