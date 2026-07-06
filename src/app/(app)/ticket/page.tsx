"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Clock,
  ImageUp,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ExpenseForm, type ExpenseFormValue } from "@/components/ExpenseForm";
import { useToast } from "@/components/Providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { api, ApiError } from "@/lib/client";
import { compressImage, compressImageToLimit } from "@/lib/image";
import { formatMoney } from "@/lib/format";
import type { PendingTicket } from "@/lib/types";
import type { TicketResult } from "@/lib/validation";

type Step = "capture" | "analyzing" | "review";
type CaptureMode = "scan" | "quick";

export default function TicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<CaptureMode>("scan");
  const confirmDialog = useConfirm();

  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<TicketResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modo rápido: fotos guardadas para confirmar más tarde.
  const [pending, setPending] = useState<PendingTicket[]>([]);
  const [quickSaving, setQuickSaving] = useState(false);
  // Id del pendiente que estamos confirmando (para borrarlo al guardar).
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    try {
      setPending(await api.get<PendingTicket[]>("/api/ticket/pending"));
    } catch {
      // Silencioso: la lista de pendientes es secundaria.
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  function pick(mode: CaptureMode) {
    modeRef.current = mode;
    fileRef.current?.click();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const mode = modeRef.current;
    if (fileRef.current) fileRef.current.value = ""; // permite reelegir el mismo archivo
    if (!file) return;

    if (mode === "quick") {
      await quickSave(file);
    } else {
      await scanAndReview(file);
    }
  }

  // --- Modo rápido: guardar la foto sin leerla ------------------------------
  async function quickSave(file: File) {
    setError(null);
    setQuickSaving(true);
    try {
      const image = await compressImageToLimit(file);
      await api.post<PendingTicket>("/api/ticket/pending", { image });
      toast("Foto guardada. La confirmás cuando quieras.", "success");
      await loadPending();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "No se pudo guardar la foto";
      setError(msg);
      toast(msg, "error");
    } finally {
      setQuickSaving(false);
    }
  }

  // --- Escaneo común: leer con IA y pasar a revisión ------------------------
  async function scanAndReview(file: File) {
    setError(null);
    setPendingId(null);
    setStep("analyzing");
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      await analyze(dataUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo leer el ticket");
      setStep("capture");
    }
  }

  async function analyze(dataUrl: string) {
    const res = await api.post<TicketResult>("/api/ticket/analyze", { image: dataUrl });
    setResult(res);
    setStep("review");
  }

  // --- Confirmar un pendiente: leerlo ahora y pasar a revisión --------------
  async function confirmPending(p: PendingTicket) {
    setError(null);
    setPendingId(p.id);
    setPreview(p.image);
    setStep("analyzing");
    try {
      await analyze(p.image);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo leer el ticket");
      setPendingId(null);
      setStep("capture");
    }
  }

  function discardPending(p: PendingTicket) {
    confirmDialog.ask(
      "¿Descartar esta foto?",
      async () => {
        setDiscardingId(p.id);
        try {
          await api.del(`/api/ticket/pending/${p.id}`);
          await loadPending();
        } catch {
          toast("No se pudo descartar", "error");
        } finally {
          setDiscardingId(null);
          confirmDialog.close();
        }
      },
      "La foto pendiente se borra de la hoja."
    );
  }

  function resetToCapture() {
    setStep("capture");
    setResult(null);
    setPreview(null);
    setPendingId(null);
  }

  async function save(value: ExpenseFormValue) {
    await api.post("/api/expenses", { ...value, source: "ticket" });
    // Si venía de un pendiente, lo borramos ahora que ya se cargó el gasto.
    if (pendingId) {
      try {
        await api.del(`/api/ticket/pending/${pendingId}`);
      } catch {
        // El gasto ya se guardó; si falla el borrado no bloqueamos al usuario.
      }
    }
    toast("Gasto guardado", "success");
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Escanear ticket" back="/" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {step === "capture" && (
        <div className="animate-fade-up space-y-4">
          <Card className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-glow animate-float">
              <Camera className="h-8 w-8" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800">Sacá una foto del ticket</h2>
              <p className="mt-1 text-sm text-slate-400">
                La IA lee el total, el comercio y la fecha. Después revisás antes de guardar.
              </p>
            </div>
          </Card>

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Button size="lg" onClick={() => pick("scan")} disabled={quickSaving}>
              <Camera className="h-5 w-5" /> Escanear y cargar ahora
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => pick("quick")}
              loading={quickSaving}
            >
              <Zap className="h-5 w-5 text-amber-500" />
              {quickSaving ? "Guardando…" : "Modo rápido: guardar para después"}
            </Button>
            <p className="text-center text-xs text-slate-400">
              <ImageUp className="mr-1 inline h-3.5 w-3.5" />
              El modo rápido solo saca la foto. La leés y confirmás cuando tengas tiempo.
            </p>
          </div>

          {pending.length > 0 && (
            <PendingList
              pending={pending}
              discardingId={discardingId}
              onConfirm={confirmPending}
              onDiscard={discardPending}
            />
          )}
        </div>
      )}

      {step === "analyzing" && (
        <div className="animate-fade-in space-y-4">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Ticket"
              className="max-h-64 w-full animate-scale-in rounded-3xl object-contain shadow-card ring-1 ring-slate-900/5"
            />
          )}
          <Card className="flex items-center justify-center gap-3 py-8">
            <Sparkles className="h-5 w-5 animate-pulse text-violet-500" />
            <span className="font-medium text-slate-600">Leyendo el ticket…</span>
          </Card>
        </div>
      )}

      {step === "review" && result && (
        <div className="animate-fade-up space-y-4">
          <DetectedCard result={result} />
          <div className="px-1">
            <h2 className="text-sm font-semibold text-slate-500">
              Revisá y corregí antes de guardar
            </h2>
          </div>
          <ExpenseForm
            initial={ticketToExpense(result)}
            submitLabel="Guardar gasto"
            onSubmit={save}
            onCancel={resetToCapture}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.state.open}
        title={confirmDialog.state.title}
        message={confirmDialog.state.message}
        confirmLabel="Descartar"
        loading={discardingId != null}
        onConfirm={() => confirmDialog.state.onConfirm?.()}
        onCancel={confirmDialog.close}
      />
    </div>
  );
}

function PendingList({
  pending,
  discardingId,
  onConfirm,
  onDiscard,
}: {
  pending: PendingTicket[];
  discardingId: string | null;
  onConfirm: (p: PendingTicket) => void;
  onDiscard: (p: PendingTicket) => void;
}) {
  return (
    <div className="animate-fade-up space-y-2">
      <h2 className="flex items-center gap-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <Clock className="h-4 w-4" /> Pendientes por confirmar ({pending.length})
      </h2>
      <div className="space-y-2">
        {pending.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt="Ticket pendiente"
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-900/5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">Foto sin leer</p>
              <p className="text-xs text-slate-400">{relativeTime(p.created_at)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="sm" onClick={() => onConfirm(p)}>
                <Sparkles className="h-4 w-4" /> Confirmar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-slate-400 hover:text-rose-600"
                loading={discardingId === p.id}
                onClick={() => onDiscard(p)}
                aria-label="Descartar"
              >
                {discardingId === p.id ? null : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** "hace 5 min", "hace 2 h", "ayer", o la fecha si es más viejo. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "recién";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ayer";
  return `hace ${diffD} días`;
}

function DetectedCard({ result }: { result: TicketResult }) {
  const confidencePct = Math.round(result.confidence * 100);
  const confColor =
    confidencePct >= 75 ? "text-emerald-600" : confidencePct >= 45 ? "text-amber-600" : "text-rose-600";

  return (
    <Card className="space-y-3 border border-violet-100 bg-violet-50/50">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-semibold text-violet-700">Datos leídos del ticket</span>
        <span className={`ml-auto text-xs font-semibold ${confColor}`}>
          {confidencePct}% seguro
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Detected label="Comercio" value={result.merchant ?? "—"} />
        <Detected label="Fecha" value={result.date ?? "—"} />
        <Detected label="Total" value={result.total != null ? formatMoney(result.total) : "—"} strong />
        <Detected label="Categoría" value={result.category} />
      </div>

      {result.items.length > 0 && (
        <details className="rounded-2xl bg-white/60 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">
            {result.items.length} items detectados
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {result.items.slice(0, 30).map((it, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">
                  {it.quantity ? `${it.quantity}× ` : ""}
                  {it.name}
                </span>
                {it.total_price != null && <span>{formatMoney(it.total_price)}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-2xl bg-amber-50 px-3 py-2">
          {result.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

function Detected({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3 py-2">
      <span className="block text-[11px] font-medium text-slate-400">{label}</span>
      <span className={strong ? "text-base font-bold text-slate-900" : "font-medium text-slate-700"}>
        {value}
      </span>
    </div>
  );
}

function ticketToExpense(result: TicketResult): Partial<ExpenseFormValue> {
  return {
    total: result.total ?? 0,
    merchant: result.merchant ?? "",
    date: result.date ?? undefined,
    category: result.category,
    description: result.merchant ?? "",
    source: "ticket",
  };
}
