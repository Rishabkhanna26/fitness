import { NextResponse } from "next/server";
import { getSettings, upsertSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function POST(request) {
  const body = await request.json();

  // Support both the legacy { intervalDate } shape and the new generic { key, value } shape
  let rows;
  if (body.key !== undefined) {
    // New generic: { key: "gym_timing", value: {...} }
    rows = [{ key: body.key, value: body.value }];
  } else {
    // Legacy shape
    rows = [
      { key: "offer", value: body.offer },
      { key: "interval_date", value: body.intervalDate },
    ].filter((r) => r.value !== undefined);
  }

  const settings = await upsertSettings(rows);
  return NextResponse.json({ settings });
}
