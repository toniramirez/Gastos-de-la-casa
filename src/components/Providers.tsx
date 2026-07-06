"use client";

// ==========================================================================
// Contextos globales del cliente: nombres (Tony/Sol editables) y toasts.
// ==========================================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { SettingsResponse } from "@/lib/api-types";
import type { Person } from "@/lib/types";

// --- Nombres ---------------------------------------------------------------

interface Names {
  tony: string;
  sol: string;
}

interface NamesContextValue {
  names: Names;
  refreshNames: () => Promise<void>;
  nameOf: (p: Person) => string;
}

const NamesContext = createContext<NamesContextValue | null>(null);

export function useNames(): NamesContextValue {
  const ctx = useContext(NamesContext);
  if (!ctx) throw new Error("useNames debe usarse dentro de <Providers>");
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
  initialNames,
}: {
  children: React.ReactNode;
  initialNames: Names;
}) {
  const [names, setNames] = useState<Names>(initialNames);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshNames = useCallback(async () => {
    try {
      const res = await api.get<SettingsResponse>("/api/settings");
      setNames({ tony: res.settings.name_tony, sol: res.settings.name_sol });
    } catch {
      // Silencioso: mantenemos los nombres que ya teníamos.
    }
  }, []);

  const nameOf = useCallback((p: Person) => (p === "tony" ? names.tony : names.sol), [names]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const namesValue = useMemo(() => ({ names, refreshNames, nameOf }), [names, refreshNames, nameOf]);
  const toastValue = useMemo(() => ({ toast }), [toast]);

  // Refrescamos por si cambiaron en otra pestaña.
  useEffect(() => {
    void refreshNames();
  }, [refreshNames]);

  return (
    <NamesContext.Provider value={namesValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <ToastViewport toasts={toasts} />
      </ToastContext.Provider>
    </NamesContext.Provider>
  );
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-soft",
            t.type === "success"
              ? "bg-emerald-600 text-white"
              : t.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-white",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
