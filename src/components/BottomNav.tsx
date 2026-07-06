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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-brand-600" : "text-slate-400"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
