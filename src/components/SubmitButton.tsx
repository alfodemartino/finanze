"use client";

import { useFormStatus } from "react-dom";
import { useLoadingWhile } from "@/components/LoadingOverlay";
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

  // Ogni invio accende anche l'overlay globale: il pulsante da solo si nota
  // poco, soprattutto quando è in fondo a un form lungo.
  useLoadingWhile(pending);

  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)}>
      {pending ? (pendingLabel ?? "Attendere…") : children}
    </button>
  );
}
