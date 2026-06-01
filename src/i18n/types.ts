import type fr from "../../messages/fr.json";

// Enables autocompletion and type-checking of message keys via t("...")
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof fr;
  }
}
