import { NextResponse } from "next/server";
import { markMemberAttendance } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json();
  if (!body.member_id) {
    return NextResponse.json({ error: "member_id is required." }, { status: 400 });
  }

  try {
    const attendance = await markMemberAttendance(body.member_id, body.status || "Present");
    return NextResponse.json({ attendance });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to mark attendance." }, { status: 500 });
  }
}
