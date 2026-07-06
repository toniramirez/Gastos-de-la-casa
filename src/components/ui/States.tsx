import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-slate-400", className)} />;
}

export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner className="h-6 w-6" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/50 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {description && <p className="max-w-xs text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-3xl border border-rose-100 bg-rose-50 px-5 py-6 text-center">
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-rose-600 underline underline-offset-2"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
