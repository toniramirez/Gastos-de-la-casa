"use client";

import { useState } from "react";
import { Button } from "./Button";

/** Modal de confirmación (para eliminar movimientos). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm animate-slide-up-sheet rounded-3xl bg-white p-5 shadow-float ring-1 ring-slate-900/5">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Hook simple para manejar el estado de confirmación de borrado. */
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; onConfirm: (() => void) | null; title: string; message?: string }>(
    { open: false, onConfirm: null, title: "" }
  );
  return {
    state,
    ask: (title: string, onConfirm: () => void, message?: string) =>
      setState({ open: true, onConfirm, title, message }),
    close: () => setState((s) => ({ ...s, open: false })),
  };
}
