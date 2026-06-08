import { NextResponse } from "next/server";
import { availMemberReward } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const body = await request.json();
  if (!body.offer_id) {
    return NextResponse.json({ error: "offer_id is required." }, { status: 400 });
  }
  try {
    const reward = await availMemberReward(params.id, body.offer_id);
    return NextResponse.json({ reward });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
