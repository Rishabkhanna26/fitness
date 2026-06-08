import { NextResponse } from "next/server";
import { getSettings, upsertSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function POST(request) {
  const body = await request.json();
  const rows = [
    { key: "offer", value: body.offer },
    { key: "interval_date", value: body.intervalDate },
  ];
  const settings = await upsertSettings(rows);
  return NextResponse.json({ settings });
}
