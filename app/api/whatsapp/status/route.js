import { NextResponse } from "next/server";

const BOT_URL = (process.env.WHATSAPP_BOT_URL || "http://localhost:3002").replace(/\/+$/, "");
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "optimus-gym-secret";

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  try {
    const res = await fetchWithTimeout(`${BOT_URL}/status`, {
      headers: { "x-bot-secret": BOT_SECRET },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({
        state: "offline",
        pairingCode: null,
        hasPairingCode: false,
        phone: null,
        reachable: false,
        error: data?.error || `Bot returned ${res.status}`,
      });
    }

    return NextResponse.json({
      state: data.state || "offline",
      pairingCode: data.pairingCode || null,
      hasPairingCode: Boolean(data.pairingCode),
      phone: data.phone || null,
      reachable: true,
    });
  } catch (err) {
    return NextResponse.json(
      { 
        state: "offline",
        pairingCode: null,
        hasPairingCode: false,
        phone: null,
        reachable: false,
        error: "Bot service unavailable",
        details: err.message,
        hint: "Bot service should be running on " + BOT_URL
      },
      { status: 200 }
    );
  }
}
