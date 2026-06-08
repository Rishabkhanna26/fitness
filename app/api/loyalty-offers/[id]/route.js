import { NextResponse } from "next/server";
import { updateLoyaltyOffer, deleteLoyaltyOffer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const body = await request.json();
  try {
    const offer = await updateLoyaltyOffer(params.id, body);
    return NextResponse.json({ offer });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await deleteLoyaltyOffer(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
