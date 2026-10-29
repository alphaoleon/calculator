import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Button({
  tone = "ghost",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ghost" | "buy" | "sell" | "accent";
}) {
  return (
    <button
      type={type}
      className={cn(
        "press inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40",
        tone === "buy" && "bg-long text-bg hover:opacity-90",
        tone === "sell" && "bg-short text-bg hover:opacity-90",
        tone === "accent" && "bg-fg text-bg hover:opacity-90",
        tone === "ghost" && "bg-raised text-fg hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function Signed({
  value,
  text,
  className,
}: {
  value: number;
  text: string;
  className?: string;
}) {
  const tone =
    value > 1e-10 ? "text-long" : value < -1e-10 ? "text-short" : "text-muted";
  return <span className={cn("font-mono tabular-nums", tone, className)}>{text}</span>;
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-3 font-mono text-base text-fg outline-none focus:border-accent";
