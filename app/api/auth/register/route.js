import { NextResponse } from "next/server";
import { registerMember } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.phone || !body.email) {
    return NextResponse.json({ error: "Name, phone number, and email are required." }, { status: 400 });
  }

  try {
    const member = await registerMember(body);
    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: "Could not register member. Check Supabase settings." }, { status: 500 });
  }
}
