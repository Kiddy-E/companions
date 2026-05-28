"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PawPrint, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  species: z.string().min(1, "L'espèce est requise").max(50),
  breed: z.string().max(100).optional(),
  birthDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  pet?: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    birthDate?: string;
    notes?: string;
    photoPath?: string;
  };
}

const SPECIES_OPTIONS = ["Chien", "Chat", "Lapin", "Oiseau", "Poisson", "Reptile", "Autre"];

export function PetForm({ pet }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    pet?.photoPath ? `/api/pets/${pet.id}/photo` : null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: pet
      ? {
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? "",
          birthDate: pet.birthDate ?? "",
          notes: pet.notes ?? "",
        }
      : {},
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const url = pet ? `/api/pets/${pet.id}` : "/api/pets";
      const method = pet ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          species: data.species,
          breed: data.breed || undefined,
          birthDate: data.birthDate || undefined,
          notes: data.notes || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Une erreur est survenue");
        return;
      }

      const saved = await res.json();

      // Upload photo if selected
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        await fetch(`/api/pets/${saved.id}/photo`, { method: "POST", body: fd });
      }

      router.push(`/pets/${saved.id}`);
      router.refresh();
    } catch {
      setError("Une erreur inattendue est survenue");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Photo upload */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden hover:bg-muted/80 transition-colors group"
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
          ) : (
            <PawPrint className="h-10 w-10 text-muted-foreground/50" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <p className="text-xs text-muted-foreground">Cliquez pour ajouter une photo</p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom *</Label>
        <Input id="name" placeholder="Ex : Luna" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Species */}
      <div className="space-y-1.5">
        <Label htmlFor="species">Espèce *</Label>
        <Input
          id="species"
          placeholder="Ex : Chien"
          list="species-list"
          {...register("species")}
        />
        <datalist id="species-list">
          {SPECIES_OPTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {errors.species && <p className="text-xs text-destructive">{errors.species.message}</p>}
      </div>

      {/* Breed */}
      <div className="space-y-1.5">
        <Label htmlFor="breed">Race / Variété</Label>
        <Input id="breed" placeholder="Ex : Labrador" {...register("breed")} />
      </div>

      {/* Birth date */}
      <div className="space-y-1.5">
        <Label htmlFor="birthDate">Date de naissance</Label>
        <Input id="birthDate" type="date" {...register("birthDate")} />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Allergies, comportement, informations importantes..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          {...register("notes")}
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {pet ? "Enregistrer les modifications" : "Ajouter l'animal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
