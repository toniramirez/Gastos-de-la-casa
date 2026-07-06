import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getStore } from "@/lib/store";

export const metadata: Metadata = {
  title: "Gastos de la casa",
  description: "Gastos compartidos de la casa, simple y desde el celular.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3385fb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

async function readInitialNames(): Promise<{ tony: string; sol: string }> {
  try {
    const settings = await getStore().getSettings();
    return { tony: settings.name_tony, sol: settings.name_sol };
  } catch {
    return { tony: "Tony", sol: "Sol" };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialNames = await readInitialNames();
  return (
    <html lang="es">
      <body>
        <Providers initialNames={initialNames}>{children}</Providers>
      </body>
    </html>
  );
}
