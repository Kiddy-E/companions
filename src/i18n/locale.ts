// Supported UI locales. `fr` is the source language and the fallback.
export const SUPPORTED_LOCALES = ["fr", "en", "es", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Native names shown in the language selector
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
