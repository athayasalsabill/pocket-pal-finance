import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Panel({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border-2 border-ink/20 bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]",
        className,
      )}
    >
      {title ? <h2 className="hand mb-3 text-2xl text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="hand py-6 text-center text-lg text-muted-foreground">{children}</p>;
}