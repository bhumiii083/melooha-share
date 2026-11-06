"use client";

import { buttonClass, fieldClass } from "@/lib/classes";
import { useEffect, useId, useRef, type ReactNode } from "react";

export { buttonClass, fieldClass };

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/15 ${className}`} aria-hidden />;
}

export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      try {
        el.showModal();
      } catch {
        /* already open */
      }
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);
  return ref;
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useDialog(open);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/30" aria-hidden />
      <h2 id={titleId} className="font-serif text-2xl leading-tight">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
