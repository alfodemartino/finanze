"use client";

import { useActionState, useState } from "react";
import { createGroupAction, deleteGroupAction, joinGroupAction } from "@/app/actions/groups";
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

/**
 * L'eliminazione del gruppo. Il pulsante resta spento finché non è stato
 * riscritto il nome del gruppo: la conferma è la stessa che pretende la server
 * action, qui serve solo a non far scoprire l'errore dopo aver premuto.
 */
export function DeleteGroupForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [state, formAction] = useActionState(deleteGroupAction, emptyActionState);
  const [confirmation, setConfirmation] = useState("");

  const confirmed = confirmation.trim().toLowerCase() === groupName.trim().toLowerCase();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        label="Scrivi il nome del gruppo per confermare"
        hint={`Spese, rimborsi e membri di «${groupName}» verranno cancellati per sempre.`}
      >
        <Input
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          placeholder={groupName}
        />
      </Field>

      <SubmitButton variant="danger" disabled={!confirmed} pendingLabel="Elimino…">
        Elimina il gruppo
      </SubmitButton>
    </form>
  );
}
