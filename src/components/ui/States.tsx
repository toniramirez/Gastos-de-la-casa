import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} />;
}

/** Bloque de esqueleto con brillo que barre (shimmer). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-slate-200/60",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
        className
      )}
    />
  );
}

/** Placeholder de carga con esqueletos que imitan el dashboard. */
export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
      {label && (
        <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Spinner className="h-4 w-4" /> {label}
        </p>
      )}
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
    <div className="flex animate-fade-up flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300/70 bg-white/50 px-6 py-14 text-center backdrop-blur-sm">
      {icon && (
        <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {description && <p className="max-w-xs text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex animate-scale-in flex-col items-center gap-3 rounded-3xl border border-rose-200/70 bg-rose-50/80 px-5 py-8 text-center backdrop-blur-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="press inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-card ring-1 ring-rose-100"
        >
          <RotateCw className="h-4 w-4" /> Reintentar
        </button>
      )}
    </div>
  );
}
