"use client";

// ==========================================================================
// Piezas para mostrar un balance entre varias personas: los pagos que hacen
// falta para saldar y el neto de cada una.
// ==========================================================================

import { ArrowRight } from "lucide-react";
import { usePeople } from "@/components/Providers";
import { formatMoney } from "@/lib/format";
import { peopleInBalance } from "@/lib/people";
import { cn } from "@/lib/cn";
import type { Balance, Transfer } from "@/lib/types";

/** Lista de pagos: "Sol → Tony $ 8.200". */
export function TransferList({
  transfers,
  tone = "light",
  className,
}: {
  transfers: Transfer[];
  /** "light" sobre fondo blanco, "onDark" sobre las tarjetas de color. */
  tone?: "light" | "onDark";
  className?: string;
}) {
  const { nameOf } = usePeople();
  if (transfers.length === 0) return null;
  const onDark = tone === "onDark";
  return (
    <ul className={cn("space-y-1.5", className)}>
      {transfers.map((t, i) => (
        <li
          key={`${t.from}-${t.to}-${i}`}
          className={cn(
            "flex items-center gap-2 text-sm",
            onDark ? "text-white/90" : "text-slate-600"
          )}
        >
          <span className={cn("font-semibold", onDark ? "text-white" : "text-slate-800")}>
            {nameOf(t.from)}
          </span>
          <ArrowRight className={cn("h-3.5 w-3.5 shrink-0", onDark ? "text-white/60" : "text-slate-400")} />
          <span className={cn("font-semibold", onDark ? "text-white" : "text-slate-800")}>
            {nameOf(t.to)}
          </span>
          <span className="ml-auto font-bold">{formatMoney(t.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Neto de cada persona: positivo = le deben, negativo = debe. */
export function NetsList({ balance, className }: { balance: Balance; className?: string }) {
  const { people, nameOf, colorFor } = usePeople();
  const shown = peopleInBalance(people, balance.nets);
  if (shown.length === 0) return null;
  return (
    <ul className={cn("divide-y divide-slate-100", className)}>
      {shown.map((p) => {
        const net = balance.nets[p.id] ?? 0;
        return (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor(p.id).base }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{nameOf(p.id)}</span>
            <span
              className={cn(
                "text-sm font-bold",
                net > 0 ? "text-emerald-600" : net < 0 ? "text-rose-600" : "text-slate-400"
              )}
            >
              {net > 0 ? `+${formatMoney(net)}` : formatMoney(net)}
            </span>
            <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
              {net > 0 ? "le deben" : net < 0 ? "debe" : "en cero"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
