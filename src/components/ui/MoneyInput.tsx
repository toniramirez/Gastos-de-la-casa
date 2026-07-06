"use client";

import { useEffect, useState } from "react";
import { formatNumber, parseMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Input de dinero en pesos: muestra "12.000" mientras escribís y devuelve el
 * número por onChange. Sin decimales por defecto.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  autoFocus,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value ? formatNumber(value) : "");

  // Sincroniza si el valor cambia desde afuera (ej: autocompletado de ticket).
  useEffect(() => {
    const parsedCurrent = parseMoney(text);
    if (Math.round(parsedCurrent) !== Math.round(value)) {
      setText(value ? formatNumber(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
        $
      </span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange(Math.round(parseMoney(raw)));
        }}
        onBlur={() => {
          const n = Math.round(parseMoney(text));
          setText(n ? formatNumber(n) : "");
        }}
        className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-9 pr-4 text-lg font-semibold text-slate-900 transition-all duration-200 placeholder:text-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50"
      />
    </div>
  );
}
