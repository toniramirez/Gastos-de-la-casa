"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, LogOut, UserCircle2 } from "lucide-react";
import { AccountsCard } from "@/components/AccountsCard";
import { PageHeader } from "@/components/PageHeader";
import { useNames, useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import type { MeResponse, SettingsResponse } from "@/lib/api-types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { LoadingBlock } from "@/components/ui/States";
import { cn } from "@/lib/cn";

export default function ConfiguracionPage() {
  const router = useRouter();
  const { refreshNames } = useNames();
  const { toast } = useToast();

  const [loaded, setLoaded] = useState(false);
  const [nameTony, setNameTony] = useState("");
  const [nameSol, setNameSol] = useState("");
  const [usingMemory, setUsingMemory] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, meRes] = await Promise.all([
        api.get<SettingsResponse>("/api/settings"),
        api.get<MeResponse>("/api/me"),
      ]);
      setNameTony(res.settings.name_tony);
      setNameSol(res.settings.name_sol);
      setUsingMemory(Boolean(res.usingMemory));
      setMe(meRes);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await api.put("/api/settings", { name_tony: nameTony.trim(), name_sol: nameSol.trim() });
      await refreshNames();
      toast("Guardado", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await api.post("/api/logout");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Configuración" back="/" />

      {!loaded ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-4">
          {me && (
            <Card className="flex animate-fade-up items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div className="text-sm">
                <p className="text-slate-400">Estás usando la cuenta</p>
                <p className="font-semibold text-slate-700">{me.name}</p>
              </div>
            </Card>
          )}

          <Card className="animate-fade-up space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Nombres</h2>
            <Field label="Persona A">
              <Input value={nameTony} onChange={(e) => setNameTony(e.target.value)} placeholder="Tony" />
            </Field>
            <Field label="Persona B">
              <Input value={nameSol} onChange={(e) => setNameSol(e.target.value)} placeholder="Sol" />
            </Field>
            <Button fullWidth onClick={save} loading={saving} disabled={!nameTony.trim() || !nameSol.trim()}>
              Guardar nombres
            </Button>
          </Card>

          {me?.isMain && <AccountsCard />}

          <Card className="flex animate-fade-up items-start gap-3 delay-1">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl",
                usingMemory ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
              )}
            >
              <Database className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-slate-700">Base de datos</p>
              {usingMemory ? (
                <p className="text-slate-400">
                  Modo demo (memoria). Configurá Google Sheets para guardar los datos de verdad.
                </p>
              ) : (
                <p className="flex items-center gap-1 text-slate-400">
                  Conectada a Google Sheets
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </p>
              )}
            </div>
          </Card>

          <div className="animate-fade-up delay-2">
            <Button variant="secondary" fullWidth onClick={logout}>
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
