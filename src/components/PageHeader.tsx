"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Encabezado de página con botón de volver opcional. */
export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  /** true = volver atrás en el historial; string = link a esa ruta. */
  back?: boolean | string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const backBtn =
    "press flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-600 shadow-card ring-1 ring-slate-900/5 backdrop-blur-sm hover:text-brand-600";
  return (
    <header className="mb-5 flex animate-fade-up items-center gap-3">
      {back &&
        (typeof back === "string" ? (
          <Link href={back} className={backBtn} aria-label="Volver">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button onClick={() => router.back()} className={backBtn} aria-label="Volver">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ))}
      <div className="flex-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
