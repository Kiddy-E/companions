import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireSession, errorResponse, ApiError } from "@/lib/auth/guard";
import { createApiToken, ALL_SCOPES } from "@/lib/auth/tokens";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const auth = requireSession(ctx);

    const tokens = await db.apiToken.findMany({
      where: { userId: auth.userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ data: tokens });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    const auth = requireSession(ctx);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const { token, prefix } = await createApiToken(
      auth.userId,
      parsed.data.name,
      parsed.data.scopes,
      parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    );

    // Return raw token ONCE — never stored in plain text
    return Response.json({ token, prefix, name: parsed.data.name, scopes: parsed.data.scopes }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
