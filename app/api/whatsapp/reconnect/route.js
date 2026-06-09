import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

const BOT_URL    = process.env.WHATSAPP_BOT_URL    || "http://localhost:3002";
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "Optimus-bot-secret";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const res = await fetch(`${BOT_URL}/reconnect`, {
      method: "POST",
      headers: { "x-bot-secret": BOT_SECRET },
    });

    if (!res.ok) throw new Error(`Bot returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
