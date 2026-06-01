"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FormData = {
  name: string;
  administeredAt: string;
  dueAt?: string;
  vet?: string;
  note?: string;
};

interface Props {
  petId: string;
  petName: string;
  vaccine?: {
    id: string;
    name: string;
    administeredAt: string;
    dueAt?: string;
    vet?: string;
    note?: string;
  };
}

const COMMON_VACCINES = [
  "Rage", "CHPL", "CHPPiLR", "Leucose féline", "Typhus / Coryza",
  "Parvovirose", "Toux du chenil", "Leptospirose",
];

export function VaccineForm({ petId, petName, vaccine }: Props) {
  const router = useRouter();
  const t = useTranslations("vaccineForm");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    name: z.string().min(1, t("nameRequired")).max(100),
    administeredAt: z.string().min(1, t("dateRequired")),
    dueAt: z.string().optional(),
    vet: z.string().max(200).optional(),
    note: z.string().max(1000).optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: vaccine
      ? {
          name: vaccine.name,
          administeredAt: vaccine.administeredAt,
          dueAt: vaccine.dueAt ?? "",
          vet: vaccine.vet ?? "",
          note: vaccine.note ?? "",
        }
      : {
          administeredAt: new Date().toISOString().split("T")[0],
        },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const url = vaccine ? `/api/vaccines/${vaccine.id}` : "/api/vaccines";
      const method = vaccine ? "PATCH" : "POST";

      const body = vaccine
        ? {
            name: data.name,
            administeredAt: new Date(data.administeredAt).toISOString(),
            dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : null,
            vet: data.vet || null,
            note: data.note || null,
          }
        : {
            petId,
            name: data.name,
            administeredAt: new Date(data.administeredAt).toISOString(),
            dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : undefined,
            vet: data.vet || undefined,
            note: data.note || undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? tCommon("error"));
        return;
      }

      router.push(`/pets/${petId}`);
      router.refresh();
    } catch {
      setError(tCommon("unexpectedError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">{t("vaccine")} *</Label>
        <Input
          id="name"
          placeholder={t("vaccinePlaceholder")}
          list="vaccine-list"
          {...register("name")}
        />
        <datalist id="vaccine-list">
          {COMMON_VACCINES.map((v) => <option key={v} value={v} />)}
        </datalist>
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="administeredAt">{t("administeredDate")} *</Label>
        <Input id="administeredAt" type="date" {...register("administeredAt")} />
        {errors.administeredAt && (
          <p className="text-xs text-destructive">{errors.administeredAt.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueAt">{t("nextReminder")}</Label>
        <Input id="dueAt" type="date" {...register("dueAt")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vet">{t("vet")}</Label>
        <Input id="vet" placeholder={t("vetPlaceholder")} {...register("vet")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">{tCommon("notes")}</Label>
        <textarea
          id="note"
          rows={2}
          placeholder={t("notesPlaceholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          {...register("note")}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {vaccine ? tCommon("save") : t("addForPet", { name: petName })}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}
