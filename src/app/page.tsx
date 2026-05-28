import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";

export default async function RootPage() {
  const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
  if (adminCount === 0) redirect("/setup");

  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  redirect("/dashboard");
}
