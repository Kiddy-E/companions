import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ApiTokensManager } from "@/components/api-tokens-manager";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez vos tokens d&#39;accès API pour les intégrations externes
        </p>
      </div>
      <ApiTokensManager initialTokens={tokens} />
    </div>
  );
}
