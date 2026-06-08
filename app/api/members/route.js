import { NextResponse } from "next/server";
import { getMembers } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ members: await getMembers() });
}
