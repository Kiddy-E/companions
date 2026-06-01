import { getRequestConfig } from "next-intl/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_LOCALE, isSupportedLocale } from "./locale";

// Resolves the active locale from the logged-in user's stored preference.
// Unauthenticated requests (login/setup) fall back to the default locale.
export default getRequestConfig(async () => {
  let locale: string = DEFAULT_LOCALE;

  try {
    const session = await getSessionFromCookie();
    if (session && isSupportedLocale(session.user.locale)) {
      locale = session.user.locale;
    }
  } catch {
    // No session / DB unavailable — keep default locale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
