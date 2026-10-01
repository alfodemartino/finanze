"use client";

import { useActionState, useRef, useState } from "react";
import { updateExpenseAmountAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { centsToInput, formatCents, parseAmountToCents } from "@/lib/money";
import { useLoadingWhile } from "@/components/LoadingOverlay";

/**
 * L'importo di una spesa già registrata, che per l'amministratore si corregge
 * sul posto: un tocco lo trasforma in un campo, e la spesa si salva con Invio
 * o lasciando il campo — il tastierino numerico di iPhone non ha un tasto
 * Invio. Esc annulla. Come le tendine di categoria e pagatore, sembra testo
 * finché non lo si tocca.
 */
export function AmountEdit({
  groupId,
  expenseId,
  amountCents,
  currency,
}: {
  groupId: string;
  expenseId: string;
  amountCents: number;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(updateExpenseAmountAction, emptyActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Invio e Esc chiudono il campo, e chiudendolo il browser può mandare anche
  // un `blur`: questo dice che la decisione è già presa.
  const closing = useRef(false);

  useLoadingWhile(pending);

  function open() {
    closing.current = false;
    setDraft(centsToInput(amountCents).replace(".", ","));
    setEditing(true);
  }

  function close() {
    closing.current = true;
    setEditing(false);
  }

  // Durante il salvataggio si vede già l'importo appena scritto, non quello
  // vecchio: se il server lo rifiuta, torna quello di prima.
  const draftCents = parseAmountToCents(draft);
  const shownCents = pending && draftCents !== null && draftCents > 0 ? draftCents : amountCents;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => {
        // Senza modifiche non c'è niente da salvare: si chiude e basta.
        if (draftCents === amountCents) event.preventDefault();
        close();
      }}
      className="inline-flex flex-col items-end"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="expenseId" value={expenseId} />

      {editing ? (
        <input
          name="amount"
          aria-label="Nuovo importo"
          inputMode="decimal"
          autoComplete="off"
          // Il campo nasce da un tocco sull'importo: il fuoco va subito lì.
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          onBlur={() => {
            if (!closing.current) formRef.current?.requestSubmit();
          }}
          className="w-28 rounded-md border border-tint bg-fill px-1.5 text-right text-[17px] font-semibold tabular-nums text-label outline-none ring-2 ring-tint/25"
        />
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={pending}
          aria-label={`Cambia l'importo, ora ${formatCents(amountCents, currency)}`}
          className={`-mr-1 rounded-md border border-transparent px-1 text-[17px] font-semibold tabular-nums text-tint hover:bg-fill focus-visible:border-tint focus-visible:ring-2 focus-visible:ring-tint/25 focus-visible:outline-none disabled:cursor-wait ${
            pending ? "opacity-60" : ""
          }`}
        >
          {formatCents(shownCents, currency)}
        </button>
      )}

      {state.error && !editing && (
        <span className="text-right text-[12px] text-negative">{state.error}</span>
      )}
    </form>
  );
}
