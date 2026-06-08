import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/checkin"];
const ADMIN_PATHS = ["/", "/members", "/attendance", "/payments", "/reports", "/settings"];

function readSession(request) {
  const value = request.cookies.get("fit_session")?.value;
  if (!value) return null;
  try {
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  const session = readSession(request);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAdminPath = ADMIN_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  );

  // Handle /checkin?scan=1 — set the qr_scanned cookie then allow through
  if (pathname.startsWith("/checkin")) {
    const response = NextResponse.next();
    if (searchParams.get("scan") === "1") {
      response.cookies.set("qr_scanned", "1", {
        httpOnly: false,  // must be readable by client JS for instant check
        sameSite: "strict",
        path: "/",
        maxAge: 120, // 2 minutes
      });
    }
    return response;
  }

  if (isPublic && session) {
    return NextResponse.redirect(new URL(session.role === "member" ? "/member" : "/", request.url));
  }

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.role === "member" && pathname !== "/member") {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  if (session?.role === "admin" && pathname === "/member") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminPath && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
