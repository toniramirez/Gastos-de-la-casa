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
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-soft">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Gastos de la casa</h1>
          <p className="mt-1 text-sm text-slate-400">Ingresá el PIN para entrar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-center text-2xl tracking-[0.5em] text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-medium text-rose-600">
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
