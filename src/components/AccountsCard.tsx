"use client";

// ==========================================================================
// Configuración → Cuentas (solo cuenta principal): generar links de
// invitación y ver / quitar las cuentas invitadas.
// ==========================================================================

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { useToast } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { AccountInfo } from "@/lib/api-types";
import type { Invite } from "@/lib/types";

function inviteUrl(id: string): string {
  return `${window.location.origin}/invitacion/${id}`;
}

export function AccountsCard() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [acc, inv] = await Promise.all([
        api.get<AccountInfo[]>("/api/accounts"),
        api.get<Invite[]>("/api/invites"),
      ]);
      setAccounts(acc);
      setInvites(inv);
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudieron cargar las cuentas", "error");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(id));
      toast("Link copiado", "success");
    } catch {
      toast("No se pudo copiar. Mantené apretado el link para copiarlo.", "error");
    }
  }

  async function share(id: string) {
    const url = inviteUrl(id);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Gastos de la casa", text: "Te invito a Gastos de la casa", url });
      } catch {
        // El usuario cerró el menú de compartir.
      }
    } else {
      await copy(id);
    }
  }

  async function createInvite() {
    setCreating(true);
    try {
      const invite = await api.post<Invite>("/api/invites");
      setInvites((list) => [invite, ...list]);
      await copy(invite.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "No se pudo generar el link", "error");
    } finally {
      setCreating(false);
    }
  }

  function askRemove(title: string, message: string, path: string) {
    confirm.ask(
      title,
      async () => {
        setDeleting(true);
        try {
          await api.del(path);
          await load();
          confirm.close();
        } catch (err) {
          toast(err instanceof Error ? err.message : "No se pudo eliminar", "error");
        } finally {
          setDeleting(false);
        }
      },
      message
    );
  }

  return (
    <Card className="animate-fade-up space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <Users className="h-4 w-4" /> Cuentas
      </h2>
      <p className="text-sm text-slate-500">
        Invitá a alguien a tener su propia cuenta, con sus gastos por separado. El link sirve una sola
        vez y vence en 7 días.
      </p>

      <Button fullWidth onClick={createInvite} loading={creating}>
        <UserPlus className="h-4 w-4" /> Generar link de invitación
      </Button>

      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Links sin usar</p>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 pl-3">
              <Link2 className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                …/invitacion/{inv.id.slice(0, 8)}… · vence {formatDate(inv.expires_at.slice(0, 10))}
              </span>
              <button onClick={() => share(inv.id)} className="press rounded-xl p-2 text-slate-500 hover:text-brand-600" aria-label="Compartir link">
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={() => copy(inv.id)} className="press rounded-xl p-2 text-slate-500 hover:text-brand-600" aria-label="Copiar link">
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  askRemove("¿Anular el link?", "Quien lo tenga ya no va a poder crear la cuenta.", `/api/invites/${inv.id}`)
                }
                className="press rounded-xl p-2 text-slate-400 hover:text-rose-600"
                aria-label="Anular link"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cuentas invitadas</p>
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2 pl-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{acc.name}</p>
                <p className="text-xs text-slate-400">Desde {formatDate(acc.created_at.slice(0, 10))}</p>
              </div>
              <button
                onClick={() =>
                  askRemove(
                    `¿Quitar el acceso de ${acc.name}?`,
                    "No va a poder entrar más. Sus datos quedan guardados en la hoja.",
                    `/api/accounts/${acc.id}`
                  )
                }
                className="press rounded-xl p-2 text-slate-400 hover:text-rose-600"
                aria-label={`Quitar acceso de ${acc.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm.state.open}
        title={confirm.state.title}
        message={confirm.state.message}
        loading={deleting}
        onConfirm={() => confirm.state.onConfirm?.()}
        onCancel={confirm.close}
      />
    </Card>
  );
}
