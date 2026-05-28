import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { Role } from "@/generated/prisma";

const setupSchema = z.object({
  username: z
    .string()
    .min(3, "3 caractères minimum")
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Lettres, chiffres, - et _ uniquement"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export async function GET() {
  const count = await db.user.count({ where: { role: Role.ADMIN } });
  return Response.json({ setupRequired: count === 0 });
}

export async function POST(req: Request) {
  // Check if setup already done
  const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
  if (adminCount > 0) {
    return Response.json(
      { error: { code: "SETUP_COMPLETE", message: "Setup already completed" } },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { username, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return Response.json(
      { error: { code: "USERNAME_TAKEN", message: "Username already in use" } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { username, passwordHash, role: Role.ADMIN },
  });

  const token = await createSession(user.id);
  const cookie = setSessionCookie(token);

  return Response.json(
    { id: user.id, username: user.username, role: user.role },
    {
      status: 201,
      headers: {
        "Set-Cookie": `${cookie.name}=${cookie.value}; Path=${cookie.options.path}; HttpOnly; SameSite=Lax; Max-Age=${cookie.options.maxAge}${cookie.options.secure ? "; Secure" : ""}`,
      },
    }
  );
}
