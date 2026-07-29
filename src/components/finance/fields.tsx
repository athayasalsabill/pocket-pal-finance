import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="hand text-lg text-ink/70">{label}</span>
      {children}
    </label>
  );
}
const base =
  "mt-1 block w-full max-w-full min-w-0 rounded-md border-2 border-ink/20 bg-background px-3 py-2 text-base text-ink outline-none focus:border-primary";
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, props.className)} />;
}
export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, props.className)} />;
}
export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "hand w-full rounded-md border-2 border-ink bg-primary px-4 py-2 text-xl text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50",
        props.className,
      )}
    />
  );
}
export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "hand rounded-md border-2 border-ink/60 bg-card px-3 py-1.5 text-lg text-ink transition-colors hover:bg-muted",
        props.className,
      )}
    />
  );
}