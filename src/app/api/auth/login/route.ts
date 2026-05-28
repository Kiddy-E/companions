import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid credentials format" } },
      { status: 422 }
    );
  }

  const { username, password } = parsed.data;
  const user = await db.user.findUnique({ where: { username } });

  // Constant-time: always verify even if user doesn't exist
  const dummyHash =
    "$argon2id$v=19$m=65536,t=3,p=1$dummy$dummy";
  const valid =
    user && user.active
      ? await verifyPassword(user.passwordHash, password)
      : await verifyPassword(dummyHash, password).catch(() => false);

  if (!user || !user.active || !valid) {
    return Response.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password" } },
      { status: 401 }
    );
  }

  const token = await createSession(user.id);
  const cookie = setSessionCookie(token);

  return Response.json(
    { id: user.id, username: user.username, role: user.role },
    {
      headers: {
        "Set-Cookie": `${cookie.name}=${cookie.value}; Path=${cookie.options.path}; HttpOnly; SameSite=Lax; Max-Age=${cookie.options.maxAge}${cookie.options.secure ? "; Secure" : ""}`,
      },
    }
  );
}
