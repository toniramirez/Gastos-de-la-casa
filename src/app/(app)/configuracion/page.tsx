"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, LogOut } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useNames, useToast } from "@/components/Providers";
import { api } from "@/lib/client";
import type { SettingsResponse } from "@/lib/api-types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { LoadingBlock } from "@/components/ui/States";

export default function ConfiguracionPage() {
  const router = useRouter();
  const { refreshNames } = useNames();
  const { toast } = useToast();

  const [loaded, setLoaded] = useState(false);
  const [nameTony, setNameTony] = useState("");
  const [nameSol, setNameSol] = useState("");
  const [usingMemory, setUsingMemory] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SettingsResponse>("/api/settings");
      setNameTony(res.settings.name_tony);
      setNameSol(res.settings.name_sol);
      setUsingMemory(Boolean(res.usingMemory));
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
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500">Nombres</h2>
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

          <Card className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Database className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-slate-700">Base de datos</p>
              <p className="text-slate-400">
                {usingMemory
                  ? "Modo demo (memoria). Configurá Google Sheets para guardar los datos de verdad."
                  : "Conectada a Google Sheets ✓"}
              </p>
            </div>
          </Card>

          <Button variant="secondary" fullWidth onClick={logout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      )}
    </div>
  );
}
