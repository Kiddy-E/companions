import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, requireAdmin, errorResponse, ApiError } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  password: z.string().min(12).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    const admin = requireAdmin(ctx);
    const { id } = await params;

    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()));
    }

    // Prevent admin from disabling themselves
    if (id === admin.userId && parsed.data.active === false) {
      throw new ApiError(400, "SELF_DEACTIVATE", "Cannot deactivate your own account");
    }

    // Prevent downgrading last admin
    if (parsed.data.role === "MEMBER" && target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
      if (adminCount <= 1) throw new ApiError(400, "LAST_ADMIN", "Cannot remove the last admin");
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    return Response.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(req);
    const admin = requireAdmin(ctx);
    const { id } = await params;

    if (id === admin.userId) {
      throw new ApiError(400, "SELF_DELETE", "Cannot delete your own account");
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

    // Prevent deleting last admin
    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
      if (adminCount <= 1) throw new ApiError(400, "LAST_ADMIN", "Cannot delete the last admin");
    }

    // Soft delete — deactivate + revoke all sessions and tokens
    await db.$transaction([
      db.user.update({ where: { id }, data: { active: false } }),
      db.session.deleteMany({ where: { userId: id } }),
      db.apiToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } }),
    ]);

    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
