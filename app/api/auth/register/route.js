import { NextResponse } from "next/server";
import { encodeSession, SESSION_COOKIE } from "@/lib/session";
import { registerMember } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "Name and phone number are required." }, { status: 400 });
  }
  if (body.duration === "Custom" && (!body.customDays || Number(body.customDays) < 1)) {
    return NextResponse.json({ error: "Enter a valid number of days for custom duration." }, { status: 400 });
  }

  try {
    const member = await registerMember(body);
    if (!member) {
      return NextResponse.json({ error: "Supabase is not configured. Check your SUPABASE_URL and SUPABASE_ANON_KEY in .env." }, { status: 500 });
    }
    const response = NextResponse.json({
      member,
      redirectTo: body.signIn ? "/member" : undefined,
    });

    if (body.signIn) {
      response.cookies.set(
        SESSION_COOKIE,
        encodeSession({ role: "member", memberId: member.id, name: member.name, email: member.email }),
        {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        }
      );
    }

    return response;
  } catch (err) {
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
