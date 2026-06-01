"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MealTime { time: string; grams?: number }

interface PetSettings {
  litterCleanHours?: number;
  litterChangeHours?: number;
  mealGrams?: number;
  meals?: MealTime[];
}

interface Props {
  petId: string;
  petName: string;
  initialSettings: PetSettings;
}

export function PetSettingsForm({ petId, petName, initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("petSettings");
  const tCommon = useTranslations("common");
  const [litterCleanHours, setLitterCleanHours] = useState<string>(
    initialSettings.litterCleanHours ? String(initialSettings.litterCleanHours) : ""
  );
  // Stored as hours internally, displayed as days in UI
  const [litterChangeDays, setLitterChangeDays] = useState<string>(
    initialSettings.litterChangeHours ? String(Math.round(initialSettings.litterChangeHours / 24)) : ""
  );
  const [mealGrams, setMealGrams] = useState<string>(
    initialSettings.mealGrams ? String(initialSettings.mealGrams) : ""
  );
  const [meals, setMeals] = useState<MealTime[]>(initialSettings.meals ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMeal() {
    setMeals(prev => [...prev, { time: "08:00" }]);
  }

  function removeMeal(i: number) {
    setMeals(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateMealTime(i: number, time: string) {
    setMeals(prev => prev.map((m, idx) => idx === i ? { ...m, time } : m));
  }

  function updateMealGrams(i: number, grams: string) {
    setMeals(prev => prev.map((m, idx) =>
      idx === i ? { ...m, grams: grams ? Number(grams) : undefined } : m
    ));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const settings: PetSettings = {};
      if (litterCleanHours) settings.litterCleanHours = Number(litterCleanHours);
      if (litterChangeDays) settings.litterChangeHours = Number(litterChangeDays) * 24;
      if (mealGrams) settings.mealGrams = Number(mealGrams);
      if (meals.length > 0) settings.meals = meals;

      const res = await fetch(`/api/pets/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error?.message ?? t("saveError"));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t("title", { name: petName })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Litter clean */}
        <div className="space-y-1.5">
          <Label>{t("litterCleanLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={168}
              placeholder={t("placeholderClean")}
              value={litterCleanHours}
              onChange={e => setLitterCleanHours(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">{tCommon("hours")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("litterCleanHint")}</p>
        </div>

        {/* Litter change */}
        <div className="space-y-1.5">
          <Label>{t("litterChangeLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              placeholder={t("placeholderChange")}
              value={litterChangeDays}
              onChange={e => setLitterChangeDays(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">{tCommon("days")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("litterChangeHint")}</p>
        </div>

        {/* Normal meal quantity */}
        <div className="space-y-1.5">
          <Label>{t("mealQtyLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={5000}
              placeholder={t("placeholderGrams")}
              value={mealGrams}
              onChange={e => setMealGrams(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">{tCommon("grams")}</span>
          </div>
        </div>

        {/* Meals per day */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("mealTimesLabel")}</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addMeal}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("add")}
            </Button>
          </div>
          {meals.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("noTimes")}</p>
          )}
          <div className="space-y-2">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">{t("mealSlot", { n: i + 1 })}</span>
                <Input
                  type="time"
                  value={m.time}
                  onChange={e => updateMealTime(i, e.target.value)}
                  className="w-28"
                />
                <Input
                  type="number"
                  min={0}
                  max={5000}
                  placeholder={mealGrams || "g"}
                  value={m.grams ?? ""}
                  onChange={e => updateMealGrams(i, e.target.value)}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">g</span>
                <button
                  type="button"
                  onClick={() => removeMeal(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {meals.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("mealLateHint")}
            </p>
          )}
        </div>

        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("saving")}</> : saved ? t("saved") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
