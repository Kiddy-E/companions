import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
  "/sw.js",
];

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIP(req);

  // Rate-limit login endpoint (brute force protection)
  if (pathname === "/api/auth/login" && req.method === "POST") {
    const result = checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
    if (!result.allowed) return rateLimitResponse(result.resetAt);
  }

  // Rate-limit event writes (Home Assistant automation spam)
  if (pathname === "/api/events" && req.method === "POST") {
    const result = checkRateLimit(`events:${ip}`, RATE_LIMITS.events);
    if (!result.allowed) return rateLimitResponse(result.resetAt);
  }

  // General API rate limit
  if (pathname.startsWith("/api/")) {
    const result = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);
    if (!result.allowed) return rateLimitResponse(result.resetAt);
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // API routes auth handled in route handlers
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // UI session gate
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
