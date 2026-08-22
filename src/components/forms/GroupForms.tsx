"use client";

import { useActionState } from "react";
import { createGroupAction, joinGroupAction } from "@/app/actions/groups";
import { emptyActionState } from "@/lib/action-state";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function CreateGroupForm() {
  const [state, formAction] = useActionState(createGroupAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Nome del gruppo" hint="Per esempio: Casa Rossi, Famiglia, Vacanze estate.">
        <Input name="name" required maxLength={60} placeholder="Casa Rossi" />
      </Field>

      <Field label="Valuta">
        <Input name="currency" defaultValue="EUR" maxLength={3} className="uppercase" />
      </Field>

      <SubmitButton pendingLabel="Creazione…">Crea il gruppo</SubmitButton>
    </form>
  );
}

export function JoinGroupForm() {
  const [state, formAction] = useActionState(joinGroupAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Codice di invito" hint="Te lo passa chi ha creato il gruppo.">
        <Input name="inviteCode" required placeholder="ABC1234" className="uppercase tracking-widest" />
      </Field>

      <SubmitButton variant="secondary" pendingLabel="Verifica…">
        Entra nel gruppo
      </SubmitButton>
    </form>
  );
}
