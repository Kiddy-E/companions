import { PetForm } from "@/components/pet-form";

export default function NewPetPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nouvel animal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Ajoutez les informations de votre animal de compagnie
        </p>
      </div>
      <PetForm />
    </div>
  );
}
