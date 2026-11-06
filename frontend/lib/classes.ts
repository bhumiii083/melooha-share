export function buttonClass(variant: "primary" | "ghost" = "primary") {
  const base =
    "inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";
  if (variant === "ghost") return `${base} border border-white/25 bg-white/10 text-white`;
  return `${base} bg-gold text-[#3d0a2c]`;
}

export const fieldClass =
  "min-h-11 w-full rounded-2xl border border-white/20 bg-white/10 px-3 text-base text-white outline-none placeholder:text-white/45";
