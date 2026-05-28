import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PetForm } from "@/components/pet-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditPetPage({ params }: Props) {
  const { id } = await params;
  const pet = await db.pet.findFirst({ where: { id, active: true } });
  if (!pet) notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Modifier {pet.name}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Mettez à jour les informations de votre animal
        </p>
      </div>
      <PetForm
        pet={{
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? undefined,
          birthDate: pet.birthDate
            ? pet.birthDate.toISOString().split("T")[0]
            : undefined,
          notes: pet.notes ?? undefined,
          photoPath: pet.photoPath ?? undefined,
        }}
      />
    </div>
  );
}
