import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cache-bust the favicon URL whenever the icon changes so Chrome picks it up
export async function generateMetadata(): Promise<Metadata> {
  const setting = await db.appSetting
    .findUnique({ where: { key: "favicon" } })
    .catch(() => null);
  const v = setting?.updatedAt ? setting.updatedAt.getTime() : 0;
  const iconUrl = `/api/settings/favicon${v ? `?v=${v}` : ""}`;

  return {
    title: "Companions",
    description: "Suivi de vos animaux de compagnie",
    manifest: "/manifest.json",
    icons: { icon: iconUrl, apple: iconUrl },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Companions" },
  };
}

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider>
          <SwRegister />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
