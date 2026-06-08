import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { hasTodayAttendance, markMemberAttendance, getMemberById } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session?.memberId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const memberId = session.memberId;

  // Block if already marked today
  const alreadyMarked = await hasTodayAttendance(memberId);
  if (alreadyMarked) {
    return NextResponse.json({ error: "Attendance already marked for today." }, { status: 400 });
  }

  // Mark attendance
  await markMemberAttendance(memberId, "Present");

  // Return updated member for visit count
  const member = await getMemberById(memberId);
  const totalVisits = member?.totalVisits ?? 0;

  return NextResponse.json({ success: true, totalVisits });
}
