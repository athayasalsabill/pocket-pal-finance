import { Link, useRouterState } from "@tanstack/react-router";
import { Home, PlusCircle, HandCoins, History, PieChart, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
const NAV = [
  { to: "/", label: "home", icon: Home },
  { to: "/add", label: "add", icon: PlusCircle },
  { to: "/debts", label: "debts", icon: HandCoins },
  { to: "/history", label: "history", icon: History },
  { to: "/stats", label: "stats", icon: PieChart },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen stripes">
      <header className="sticky top-0 z-20">
        <div className="flex items-center justify-between bg-card px-4 py-3">
          <Link to="/" className="hand text-2xl font-bold text-primary">
            duit &amp; catatan
          </Link>
          <Link
            to="/settings"
            className="rounded-full p-2 text-ink/70 transition-colors hover:bg-muted"
            aria-label="Pengaturan &amp; backup"
          >
            <Settings className="size-5" />
          </Link>
        </div>
        <div className="h-2 stripes-thin" />
      </header>
      <main className="mx-auto w-full max-w-md px-3 pt-4 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink/15 bg-card pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors",
                    active ? "text-primary" : "text-ink/55",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                  <span className="hand text-sm leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}