import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE_NAME = "companions_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.session.deleteMany({ where: { tokenHash } });
}

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: env.SECURE_COOKIES,
      sameSite: "lax" as const,
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
      path: "/",
    },
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: env.SECURE_COOKIES,
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/",
    },
  };
}
