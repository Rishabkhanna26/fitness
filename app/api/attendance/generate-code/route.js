import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { generateAttendanceCode, findMemberByPhone } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const cookieStore = await cookies();

  // Enforce QR scan flag
  const qrScanned = cookieStore.get("qr_scanned")?.value;
  if (!qrScanned) {
    return NextResponse.json(
      { error: "QR scan required. Please scan the gym QR code to proceed." },
      { status: 403 }
    );
  }

  let memberId;

  // Check if member is logged in via session
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (session?.role === "member" && session.memberId) {
    memberId = session.memberId;
  } else {
    // Guest flow — identify by phone number
    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    const member = await findMemberByPhone(phone);
    if (!member) {
      return NextResponse.json(
        { error: "Mobile number not registered. Please contact the gym." },
        { status: 404 }
      );
    }
    memberId = member.id;
  }

  try {
    const record = await generateAttendanceCode(memberId);
    if (!record) {
      return NextResponse.json({ error: "Failed to generate code. Check Supabase config." }, { status: 500 });
    }
    return NextResponse.json({ code: record.code, expiresAt: record.expires_at, memberId });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to generate code." }, { status: 500 });
  }
}
