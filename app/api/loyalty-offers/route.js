import { NextResponse } from "next/server";
import { getLoyaltyOffers, createLoyaltyOffer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ offers: await getLoyaltyOffers() });
}

export async function POST(request) {
  const body = await request.json();
  if (!body.title || !body.offer_type || body.amount == null || !body.interval_unit || !body.interval_value) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  try {
    const offer = await createLoyaltyOffer(body);
    return NextResponse.json({ offer });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to create offer." }, { status: 500 });
  }
}
