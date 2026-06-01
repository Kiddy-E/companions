import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, errorResponse } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/i18n/locale";

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
      select: { id: true, username: true, role: true, locale: true, createdAt: true },
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

const updateSchema = z
  .object({
    locale: z.enum(SUPPORTED_LOCALES),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid locale" } },
        { status: 422 }
      );
    }

    const user = await db.user.update({
      where: { id: ctx.userId },
      data: { locale: parsed.data.locale },
      select: { id: true, username: true, role: true, locale: true, createdAt: true },
    });

    return Response.json(user);
  } catch (err) {
    return errorResponse(err);
  }
}
