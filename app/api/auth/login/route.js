import { NextResponse } from "next/server";
import { ADMIN_CREDENTIALS } from "@/lib/adminCredentials";
import { encodeSession, SESSION_COOKIE } from "@/lib/session";
import { findMemberByPhone } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  const role = body.role || "member";

  if (role === "admin") {
    const emailOk = body.email?.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
    const passwordOk = body.password === ADMIN_CREDENTIALS.password;
    if (!emailOk || !passwordOk) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    const response = NextResponse.json({ redirectTo: "/" });
    response.cookies.set(SESSION_COOKIE, encodeSession({ role: "admin", email: ADMIN_CREDENTIALS.email, name: ADMIN_CREDENTIALS.name }), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  const member = await findMemberByPhone(body.phone || body.identifier || "");
  if (!member) {
    return NextResponse.json(
      { error: "Member not found. Create a new record to continue.", code: "member_not_found" },
      { status: 404 }
    );
  }

  const response = NextResponse.json({ redirectTo: "/member" });
  response.cookies.set(SESSION_COOKIE, encodeSession({ role: "member", memberId: member.id, name: member.name, email: member.email }), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
