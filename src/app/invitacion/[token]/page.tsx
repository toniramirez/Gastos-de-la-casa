"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/client";

type Status = "loading" | "valid" | "used" | "expired" | "missing";

const INVALID_MESSAGES: Record<Exclude<Status, "loading" | "valid">, string> = {
  used: "Esta invitación ya se usó. Si ya creaste tu cuenta, entrá con tu contraseña.",
  expired: "Esta invitación venció. Pedile a quien te invitó un link nuevo.",
  missing: "Este link de invitación no existe o fue anulado.",
};

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white/80 py-4 pl-12 pr-4 text-lg text-slate-900 backdrop-blur-sm transition-all duration-200 placeholder:text-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export default function InvitacionPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ status: Status }>(`/api/register?token=${encodeURIComponent(params.token)}`)
      .then((res) => setStatus(res.status))
      .catch(() => setStatus("missing"));
  }, [params.token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/register", { token: params.token, name: name.trim(), password });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-400/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex animate-fade-up flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-4xl bg-brand-mesh text-white shadow-glow animate-float">
            <UserPlus className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Te invitaron</h1>
          <p className="mt-1 text-sm text-slate-400">Creá tu cuenta en Gastos de la casa</p>
        </div>

        {status === "loading" ? (
          <p className="text-center text-sm text-slate-400">Revisando la invitación…</p>
        ) : status !== "valid" ? (
          <div className="animate-fade-up space-y-4 text-center">
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              {INVALID_MESSAGES[status]}
            </p>
            <Link href="/login" className="block text-sm font-semibold text-brand-600">
              Ir a entrar
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="animate-fade-up space-y-3 delay-1">
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="¿Cómo te llamás?"
                aria-label="Nombre"
                maxLength={30}
                autoComplete="name"
                className={inputCls}
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                aria-label="Contraseña"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                aria-label="Repetir contraseña"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            <p className="px-1 text-xs text-slate-400">
              Mínimo 4 caracteres. Para entrar después, solo vas a necesitar la contraseña.
            </p>

            {error && (
              <p className="animate-slide-down rounded-2xl bg-rose-50 px-4 py-2.5 text-center text-sm font-medium text-rose-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!name.trim() || password.length < 4 || !confirm}
            >
              Crear cuenta
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
