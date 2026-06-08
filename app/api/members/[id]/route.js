import { NextResponse } from "next/server";
import { getMemberById } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const member = await getMemberById(params.id);
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ member });
}
