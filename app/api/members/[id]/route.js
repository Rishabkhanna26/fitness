import { NextResponse } from "next/server";
import { getMemberById, updateMember, deleteMember } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const member = await updateMember(id, body);
    if (!member) return NextResponse.json({ error: "Member not found or update failed." }, { status: 404 });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to update member." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to delete member." }, { status: 500 });
  }
}
