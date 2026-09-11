"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel,
  className = "btn primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? pendingLabel ?? "…" : children}
    </button>
  );
}
