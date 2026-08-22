"use client";

import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonVariant } from "@/components/ui";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)}>
      {pending ? (pendingLabel ?? "Attendere…") : children}
    </button>
  );
}
