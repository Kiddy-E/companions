import { getSessionFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelector } from "@/components/language-selector";

export default async function ProfilePage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");

  const t = await getTranslations("profile");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <LanguageSelector />
        </CardContent>
      </Card>
    </div>
  );
}
