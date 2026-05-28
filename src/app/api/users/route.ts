import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireAdmin, errorResponse, ApiError } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";

const createSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(12, "Password must be at least 12 characters"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireAdmin(ctx);

    const users = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, role: true, active: true, createdAt: true },
    });

    return Response.json({ data: users });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    requireAdmin(ctx);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    const existing = await db.user.findUnique({ where: { username: parsed.data.username } });
    if (existing) throw new ApiError(409, "USERNAME_TAKEN", "Username already in use");

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await db.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: parsed.data.role as "ADMIN" | "MEMBER",
      },
      select: { id: true, username: true, role: true, active: true, createdAt: true },
    });

    return Response.json(user, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
