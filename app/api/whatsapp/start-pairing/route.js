import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

const BOT_URL = (process.env.WHATSAPP_BOT_URL || "http://localhost:3002").replace(/\/+$/, "");
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "optimus-gym-secret";

export async function POST(request) {
  try {
    // Only admins can configure WhatsApp
    const cookieStore = await cookies();
    const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const res = await fetch(`${BOT_URL}/start-pairing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SECRET,
      },
      body: JSON.stringify({ phone }),
      timeout: 5000,
    });

    if (!res.ok) {
      console.error(`Bot service error: ${res.status}`);
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Start pairing error:", err);
    return NextResponse.json(
      { 
        error: "Request failed", 
        details: err.message,
        hint: "Make sure bot service is running on " + BOT_URL
      },
      { status: 500 }
    );
  }
}
