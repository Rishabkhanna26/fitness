import { NextResponse } from "next/server";
import { registerMember } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.phone || !body.email) {
    return NextResponse.json({ error: "Name, phone number, and email are required." }, { status: 400 });
  }

  try {
    const member = await registerMember(body);
    if (!member) {
      return NextResponse.json({ error: "Supabase is not configured. Check your SUPABASE_URL and SUPABASE_ANON_KEY in .env." }, { status: 500 });
    }
    return NextResponse.json({ member });
  } catch (err) {
    // Surface the real error message from Supabase
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}