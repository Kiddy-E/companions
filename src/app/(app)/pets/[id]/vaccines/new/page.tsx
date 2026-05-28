import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { VaccineForm } from "@/components/vaccine-form";

type Props = { params: Promise<{ id: string }> };

export default async function NewVaccinePage({ params }: Props) {
  const { id } = await params;
  const pet = await db.pet.findFirst({ where: { id, active: true } });
  if (!pet) notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nouveau vaccin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Pour {pet.name}
        </p>
      </div>
      <VaccineForm petId={pet.id} petName={pet.name} />
    </div>
  );
}
