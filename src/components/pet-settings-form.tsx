"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MealTime { time: string }

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
  const [litterCleanHours, setLitterCleanHours] = useState<string>(
    initialSettings.litterCleanHours ? String(initialSettings.litterCleanHours) : ""
  );
  const [litterChangeHours, setLitterChangeHours] = useState<string>(
    initialSettings.litterChangeHours ? String(initialSettings.litterChangeHours) : ""
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
    setMeals(prev => prev.map((m, idx) => idx === i ? { time } : m));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const settings: PetSettings = {};
      if (litterCleanHours) settings.litterCleanHours = Number(litterCleanHours);
      if (litterChangeHours) settings.litterChangeHours = Number(litterChangeHours);
      if (mealGrams) settings.mealGrams = Number(mealGrams);
      if (meals.length > 0) settings.meals = meals;

      const res = await fetch(`/api/pets/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error?.message ?? "Erreur lors de la sauvegarde");
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
        <CardTitle className="text-sm font-medium">Paramètres — {petName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Litter clean */}
        <div className="space-y-1.5">
          <Label>🧹 Délai avant nettoyage</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={168}
              placeholder="Ex : 24"
              value={litterCleanHours}
              onChange={e => setLitterCleanHours(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">heures</span>
          </div>
          <p className="text-xs text-muted-foreground">Alerte si pas de nettoyage depuis ce délai</p>
        </div>

        {/* Litter change */}
        <div className="space-y-1.5">
          <Label>♻️ Délai avant changement complet</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={720}
              placeholder="Ex : 168"
              value={litterChangeHours}
              onChange={e => setLitterChangeHours(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">heures</span>
          </div>
          <p className="text-xs text-muted-foreground">Alerte si pas de changement complet depuis ce délai</p>
        </div>

        {/* Normal meal quantity */}
        <div className="space-y-1.5">
          <Label>Quantité normale d'un repas</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={5000}
              placeholder="Ex : 200"
              value={mealGrams}
              onChange={e => setMealGrams(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">grammes</span>
          </div>
        </div>

        {/* Meals per day */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Horaires des repas</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addMeal}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter
            </Button>
          </div>
          {meals.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun horaire configuré</p>
          )}
          <div className="space-y-2">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Repas {i + 1}</span>
                <Input
                  type="time"
                  value={m.time}
                  onChange={e => updateMealTime(i, e.target.value)}
                  className="w-32"
                />
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
              Alerte si un repas prévu est en retard de plus d'1 heure
            </p>
          )}
        </div>

        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Enregistrement...</> : saved ? "✅ Enregistré" : "Enregistrer les paramètres"}
        </Button>
      </CardContent>
    </Card>
  );
}
