import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VaccineForm } from "@/components/vaccine-form";

type Props = { params: Promise<{ id: string }> };

export default async function NewVaccinePage({ params }: Props) {
  const { id } = await params;
  const pet = await db.pet.findFirst({ where: { id, active: true } });
  if (!pet) notFound();

  const t = await getTranslations("vaccineForm");

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("forPet", { name: pet.name })}
        </p>
      </div>
      <VaccineForm petId={pet.id} petName={pet.name} />
    </div>
  );
}
