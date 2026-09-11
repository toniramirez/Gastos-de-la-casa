"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/login", { pin });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo entrar");
      setPin("");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Glows de fondo flotantes */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-400/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex animate-fade-up flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-4xl bg-brand-mesh text-white shadow-glow animate-float">
            <Home className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gastos de la casa</h1>
          <p className="mt-1 text-sm text-slate-400">Ingresá tu contraseña para entrar</p>
        </div>

        <form onSubmit={submit} className="animate-fade-up space-y-4 delay-1">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              aria-label="Contraseña"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 py-4 pl-12 pr-4 text-center text-2xl tracking-[0.3em] text-slate-900 backdrop-blur-sm transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
          </div>

          {error && (
            <p className="animate-slide-down rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-medium text-rose-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading} disabled={!pin}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
