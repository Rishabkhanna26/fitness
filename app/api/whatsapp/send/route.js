import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

const BOT_URL = (process.env.WHATSAPP_BOT_URL || "http://localhost:3002").replace(/\/+$/, "");
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "optimus-gym-secret";

export async function POST(request) {
  try {
    // Only admins
    const cookieStore = await cookies();
    const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { to, message } = await request.json();
    if (!to || !message) {
      return NextResponse.json(
        { error: "to and message required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BOT_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SECRET,
      },
      body: JSON.stringify({ to, message }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
