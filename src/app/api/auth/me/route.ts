import { NextRequest } from "next/server";
import { getAuthContext, errorResponse } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return Response.json(user);
  } catch (err) {
    return errorResponse(err);
  }
}
