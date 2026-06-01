import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Role } from "@/generated/prisma";
import { UsersManager } from "@/components/users-manager";

export default async function UsersPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  const t = await getTranslations("users");

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, active: true, createdAt: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("subtitle")}
        </p>
      </div>
      <UsersManager initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
