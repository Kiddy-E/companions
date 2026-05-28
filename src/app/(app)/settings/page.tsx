import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@/generated/prisma";
import { ApiTokensManager } from "@/components/api-tokens-manager";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default async function SettingsPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const tokens = await db.apiToken.findMany({
    where: { userId: session.userId, revokedAt: null },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Tokens API et configuration
          </p>
        </div>
        {session.user.role === Role.ADMIN && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/users">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Utilisateurs
            </Link>
          </Button>
        )}
      </div>
      <ApiTokensManager initialTokens={tokens} />
    </div>
  );
}
