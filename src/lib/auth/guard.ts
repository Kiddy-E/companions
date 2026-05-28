import { NextRequest } from "next/server";
import { getSessionFromCookie } from "./session";
import { verifyApiToken, hasScope, type Scope } from "./tokens";
import { Role } from "@/generated/prisma";

export type AuthContext =
  | { type: "session"; userId: string; role: Role; name: string }
  | { type: "token"; userId: string; scopes: string[] };

export async function getAuthContext(
  req: NextRequest
): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7);
    const result = await verifyApiToken(rawToken);
    if (result) return { type: "token", ...result };
    return null;
  }

  const session = await getSessionFromCookie();
  if (session && session.user.active) {
    return {
      type: "session",
      userId: session.userId,
      role: session.user.role,
      name: session.user.name,
    };
  }

  return null;
}

export function requireAuth(ctx: AuthContext | null): AuthContext {
  if (!ctx) throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  return ctx;
}

export function requireSession(ctx: AuthContext | null) {
  const auth = requireAuth(ctx);
  if (auth.type !== "session")
    throw new ApiError(403, "FORBIDDEN", "Session required");
  return auth;
}

export function requireAdmin(ctx: AuthContext | null) {
  const auth = requireSession(ctx);
  if (auth.role !== Role.ADMIN)
    throw new ApiError(403, "FORBIDDEN", "Admin role required");
  return auth;
}

export function requireScope(ctx: AuthContext | null, scope: Scope) {
  const auth = requireAuth(ctx);
  if (auth.type === "session") return auth; // session has all scopes
  if (!hasScope(auth.scopes, scope))
    throw new ApiError(403, "FORBIDDEN", `Missing scope: ${scope}`);
  return auth;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }
  console.error(err);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  );
}
