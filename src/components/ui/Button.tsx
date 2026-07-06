"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "sheen-overlay bg-brand-gradient text-white shadow-glow hover:shadow-glow hover:brightness-[1.05] active:brightness-95",
  secondary:
    "bg-white/80 text-slate-700 ring-1 ring-slate-900/10 backdrop-blur-sm hover:bg-white active:bg-slate-50 shadow-card",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-900/5",
  danger:
    "sheen-overlay bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_30px_-8px_rgba(244,63,94,0.5)] hover:brightness-[1.05] active:brightness-95",
  success:
    "sheen-overlay bg-emerald-gradient text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.5)] hover:brightness-[1.05] active:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-4 text-[15px] rounded-2xl",
  lg: "h-14 px-5 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-semibold",
        "transition-all duration-200 ease-out will-change-transform active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
