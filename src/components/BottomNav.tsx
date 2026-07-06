"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Scale, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/historial", label: "Historial", icon: ListChecks },
  { href: "/cierre", label: "Cierre", icon: Scale },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="glass-nav mx-auto max-w-md border-t border-white/60 shadow-[0_-8px_30px_-12px_rgba(23,17,54,0.15)]">
        <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  "transition-colors duration-300",
                  active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300 ease-out",
                    active ? "bg-brand-100/80 shadow-glow-sm" : "bg-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-300 ease-out",
                      active ? "scale-110 stroke-[2.4] text-brand-600" : "group-active:scale-90"
                    )}
                  />
                </span>
                <span className={cn("transition-all duration-300", active && "font-semibold")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
