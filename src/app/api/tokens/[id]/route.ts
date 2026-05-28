import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, requireSession, errorResponse, ApiError } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    const auth = requireSession(ctx);
    const { id } = await params;

    const token = await db.apiToken.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!token) throw new ApiError(404, "NOT_FOUND", "Token not found");
    if (token.revokedAt) throw new ApiError(409, "ALREADY_REVOKED", "Token already revoked");

    await db.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
