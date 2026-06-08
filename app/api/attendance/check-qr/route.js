import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const qrScanned = cookieStore.get("qr_scanned")?.value;

  if (!qrScanned) {
    return NextResponse.json({ allowed: false });
  }

  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  const loggedIn = session?.role === "member" && !!session.memberId;

  return NextResponse.json({ allowed: true, loggedIn });
}
