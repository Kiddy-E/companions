import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma";
import { UsersManager } from "@/components/users-manager";

export default async function UsersPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez les comptes membres de votre foyer
        </p>
      </div>
      <UsersManager initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
