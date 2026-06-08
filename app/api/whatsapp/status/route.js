import { NextResponse } from "next/server";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "Optimus-bot-secret";

export async function GET() {
  try {
    const res = await fetch(`${BOT_URL}/status`, {
      headers: { "x-bot-secret": BOT_SECRET },
    });
    if (!res.ok) throw new Error(`Bot returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Bot service unavailable", details: err.message },
      { status: 503 }
    );
  }
}
