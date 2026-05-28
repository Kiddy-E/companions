import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/api/health",
  "/api/setup",
  "/api/auth/login",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/icons",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // API routes protected by Bearer token or session cookie checked in route handlers
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const sessionCookie = req.cookies.get("companions_session");
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
