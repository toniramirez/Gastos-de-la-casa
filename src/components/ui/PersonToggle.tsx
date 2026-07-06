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
      ? "border-tony bg-tony-soft text-tony"
      : "border-sol bg-sol-soft text-sol";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-2xl border-2 font-semibold transition-colors",
        active ? activeCls : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
