"use client";

import { useNames } from "@/components/Providers";
import { cn } from "@/lib/cn";
import type { Person } from "@/lib/types";

/** Selector de persona con dos botones grandes (Tony / Sol). */
export function PersonToggle({
  value,
  onChange,
  className,
}: {
  value: Person;
  onChange: (p: Person) => void;
  className?: string;
}) {
  const { names } = useNames();
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Option active={value === "tony"} onClick={() => onChange("tony")} color="tony">
        {names.tony}
      </Option>
      <Option active={value === "sol"} onClick={() => onChange("sol")} color="sol">
        {names.sol}
      </Option>
    </div>
  );
}

function Option({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: "tony" | "sol";
  children: React.ReactNode;
}) {
  const activeCls =
    color === "tony"
      ? "border-tony bg-tony-soft text-tony-deep shadow-[0_8px_20px_-8px_rgba(14,165,233,0.5)]"
      : "border-sol bg-sol-soft text-sol-deep shadow-[0_8px_20px_-8px_rgba(236,72,153,0.5)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press h-12 rounded-2xl border-2 font-semibold transition-all duration-200",
        active
          ? cn(activeCls, "scale-[1.02]")
          : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
