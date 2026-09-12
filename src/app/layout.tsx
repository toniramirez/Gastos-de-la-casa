import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { defaultPeople } from "@/lib/people";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { Person } from "@/lib/types";

export const metadata: Metadata = {
  title: "Gastos de la casa",
  description: "Gastos compartidos de la casa, simple y desde el celular.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#6a48ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/** Personas de la cuenta para el primer render (después el cliente refresca). */
async function readInitialPeople(): Promise<Person[]> {
  try {
    const session = await getSession();
    if (!session) return defaultPeople();
    const settings = await getStore(session.accountId).getSettings();
    return settings.people;
  } catch {
    return defaultPeople();
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialPeople = await readInitialPeople();
  return (
    <html lang="es">
      <body>
        <Providers initialPeople={initialPeople}>{children}</Providers>
      </body>
    </html>
  );
}
