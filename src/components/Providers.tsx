"use client";

// ==========================================================================
// Contextos globales del cliente: las personas de la casa (editables desde
// Configuración) y los toasts.
// ==========================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { SettingsResponse } from "@/lib/api-types";
import { activePeople, colorOf, DEFAULT_COLOR, personName, type PersonColor } from "@/lib/people";
import type { Person, PersonId } from "@/lib/types";

// --- Personas ---------------------------------------------------------------

interface PeopleContextValue {
  /** Todas, incluidas las desactivadas (para leer el historial). */
  people: Person[];
  /** Las que hoy participan de los gastos: es lo que va en los formularios. */
  active: Person[];
  refreshPeople: () => Promise<void>;
  /** Nombre visible de una persona por id. */
  nameOf: (id: PersonId | "") => string;
  /** Acento de color de una persona por id. */
  colorFor: (id: PersonId | "") => PersonColor;
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function usePeople(): PeopleContextValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error("usePeople debe usarse dentro de <Providers>");
  return ctx;
}

// --- Toasts ----------------------------------------------------------------

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <Providers>");
  return ctx;
}

let toastId = 0;

export function Providers({
  children,
  initialPeople,
}: {
  children: React.ReactNode;
  initialPeople: Person[];
}) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshPeople = useCallback(async () => {
    try {
      const res = await api.get<SettingsResponse>("/api/settings");
      if (res.settings.people?.length) setPeople(res.settings.people);
    } catch {
      // Silencioso: mantenemos la lista que ya teníamos.
    }
  }, []);

  const nameOf = useCallback((id: PersonId | "") => personName(people, id), [people]);

  const colorFor = useCallback(
    (id: PersonId | "") => {
      const found = people.find((p) => p.id === id);
      return found ? colorOf(found.color) : DEFAULT_COLOR;
    },
    [people]
  );

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const peopleValue = useMemo(
    () => ({ people, active: activePeople(people), refreshPeople, nameOf, colorFor }),
    [people, refreshPeople, nameOf, colorFor]
  );
  const toastValue = useMemo(() => ({ toast }), [toast]);

  // Refrescamos por si cambiaron en otra pestaña.
  useEffect(() => {
    void refreshPeople();
  }, [refreshPeople]);

  return (
    <PeopleContext.Provider value={peopleValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <ToastViewport toasts={toasts} />
      </ToastContext.Provider>
    </PeopleContext.Provider>
  );
}

const TOAST_META: Record<ToastType, { icon: typeof Info; ring: string; iconCls: string }> = {
  success: { icon: CheckCircle2, ring: "ring-emerald-500/20", iconCls: "text-emerald-500" },
  error: { icon: XCircle, ring: "ring-rose-500/20", iconCls: "text-rose-500" },
  info: { icon: Info, ring: "ring-brand-500/20", iconCls: "text-brand-500" },
};

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const { icon: Icon, ring, iconCls } = TOAST_META[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "glass pointer-events-auto flex w-full max-w-sm animate-slide-down items-center gap-3 rounded-2xl px-4 py-3",
              "text-sm font-medium text-slate-800 shadow-float ring-1",
              ring
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", iconCls)} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
