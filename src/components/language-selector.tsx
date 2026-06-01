"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SUPPORTED_LOCALES, LOCALE_NAMES } from "@/i18n/locale";

export function LanguageSelector() {
  const router = useRouter();
  const currentLocale = useLocale();
  const t = useTranslations("profile");
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value;
    if (locale === currentLocale) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        setSaved(true);
        // Re-render server components with the new locale
        startTransition(() => router.refresh());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="locale">{t("language")}</Label>
      <div className="flex items-center gap-2">
        <select
          id="locale"
          defaultValue={currentLocale}
          onChange={onChange}
          disabled={saving || pending}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {LOCALE_NAMES[loc]}
            </option>
          ))}
        </select>
        {(saving || pending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {saved && !saving && !pending && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" />
            {t("languageSaved")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("languageDesc")}</p>
    </div>
  );
}
