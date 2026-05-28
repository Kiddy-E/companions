export type SpeciesProfile = "dog" | "cat" | "rabbit" | "bird" | "fish" | "reptile" | "other";

const DOG_KEYWORDS = ["chien", "chienne", "dog", "labrador", "berger", "golden", "husky", "bouledogue", "bichon", "caniche", "beagle", "boxer"];
const CAT_KEYWORDS = ["chat", "chatte", "cat", "félin", "felin", "siamois", "persan", "maine", "ragdoll", "british", "bengal"];
const RABBIT_KEYWORDS = ["lapin", "lapine", "rabbit", "bunny", "cobaye", "cochon d'inde", "hamster"];
const BIRD_KEYWORDS = ["oiseau", "perruche", "perroquet", "canari", "bird", "parrot", "cockatiel", "cacatoès"];
const FISH_KEYWORDS = ["poisson", "fish", "betta", "guppy", "neon", "carpe", "goldfish"];
const REPTILE_KEYWORDS = ["reptile", "lézard", "serpent", "tortue", "gecko", "iguane", "caméléon", "bearded", "agame"];

export function getSpeciesProfile(species: string): SpeciesProfile {
  const s = species.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (DOG_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "dog";
  if (CAT_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "cat";
  if (RABBIT_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "rabbit";
  if (BIRD_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "bird";
  if (FISH_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "fish";
  if (REPTILE_KEYWORDS.some(k => s.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, "")))) return "reptile";
  return "other";
}

// Quick action types per species profile (ordered, displayed as buttons)
export const SPECIES_QUICK_ACTIONS: Record<SpeciesProfile, string[]> = {
  dog:     ["WALK", "MEAL", "PEE", "POOP", "MED", "BATH", "PLAY", "TRAINING", "OTHER"],
  cat:     ["LITTER", "MEAL", "PLAY", "GROOM", "MED", "BATH", "OTHER"],
  rabbit:  ["LITTER", "MEAL", "PLAY", "GROOM", "MED", "OTHER"],
  bird:    ["MEAL", "PLAY", "MED", "OTHER"],
  fish:    ["MEAL", "WATER_CHANGE", "MED", "OTHER"],
  reptile: ["MEAL", "WATER_CHANGE", "MED", "OTHER"],
  other:   ["MEAL", "PLAY", "MED", "BATH", "OTHER"],
};

// Full label map for all event types
export const EVENT_LABEL_MAP: Record<string, { emoji: string; label: string }> = {
  WALK:         { emoji: "🦮", label: "Sortie" },
  MEAL:         { emoji: "🍽️", label: "Repas" },
  PEE:          { emoji: "💧", label: "Pipi" },
  POOP:         { emoji: "💩", label: "Caca" },
  MED:          { emoji: "💊", label: "Soin" },
  BATH:         { emoji: "🛁", label: "Bain" },
  LITTER:       { emoji: "🪣", label: "Litière" },
  PLAY:         { emoji: "🎾", label: "Jeu" },
  GROOM:        { emoji: "✂️", label: "Toilettage" },
  WATER_CHANGE: { emoji: "💧", label: "Eau" },
  TRAINING:     { emoji: "🏅", label: "Dressage" },
  OTHER:        { emoji: "📝", label: "Autre" },
};
