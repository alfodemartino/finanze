"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveKeywordAction } from "@/app/actions/categories";
import { emptyActionState } from "@/lib/action-state";
import { CATEGORIES, CATEGORY_IDS } from "@/lib/categories";
import { useLoadingWhile } from "@/components/LoadingOverlay";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Aggiunge una parola chiave o la sposta in un'altra categoria: per il server
 * è la stessa operazione, perché una parola ha al più una categoria.
 */
export function AddKeywordForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(saveKeywordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <Field
        label="Parola chiave"
        hint="Una parola o una frase intera. Con l'asterisco finale vale come inizio di parola: «pizz*» trova pizza e pizzeria."
      >
        <Input name="keyword" required maxLength={60} placeholder="Lezioni di Marco" autoComplete="off" />
      </Field>

      <Field
        label="Categoria"
        hint="Se la parola indica già un'altra categoria, passa a questa."
      >
        <Select name="category" required defaultValue="">
          <option value="" disabled>
            Scegli una categoria
          </option>
          {CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {CATEGORIES[id].label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="Salvo…">Salva la parola</SubmitButton>
    </form>
  );
}

/**
 * Accende l'overlay mentre il form che la contiene aspetta la risposta. Non
 * disegna niente: i pulsanti accanto alle parole restano HTML del server, e
 * basta una di queste per form invece di un componente per parola, che con
 * centinaia di parole appesantiva la pagina.
 */
export function FormPending() {
  const { pending } = useFormStatus();
  useLoadingWhile(pending);
  return null;
}
