import { getTranslations } from "next-intl/server";
import { PetForm } from "@/components/pet-form";

export default async function NewPetPage() {
  const t = await getTranslations("pets");
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("newPetTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("newPetDesc")}
        </p>
      </div>
      <PetForm />
    </div>
  );
}
