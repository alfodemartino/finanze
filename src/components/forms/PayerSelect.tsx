"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateExpensePayerAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { useLoadingWhile } from "@/components/LoadingOverlay";

export type PayerOption = { id: string; name: string };

/**
 * Il nome di chi ha pagato, che per l'amministratore è una tendina: si sceglie
 * un altro membro e la spesa viene salvata subito, senza un pulsante «salva».
 * Sembra testo finché non ci si passa sopra, così lo storico resta leggibile.
 */
export function PayerSelect({
  groupId,
  expenseId,
  payerId,
  members,
}: {
  groupId: string;
  expenseId: string;
  payerId: string;
  members: PayerOption[];
}) {
  const [state, formAction, pending] = useActionState(updateExpensePayerAction, emptyActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(payerId);

  useLoadingWhile(pending);

  // Il pagatore arriva dal server: dopo il salvataggio la tendina segue quello
  // appena confermato e, se la modifica fallisce, torna sul nome di prima.
  useEffect(() => setValue(payerId), [payerId, state]);

  const selectedName = members.find((member) => member.id === value)?.name ?? "";

  return (
    <form ref={formRef} action={formAction} className="inline">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="expenseId" value={expenseId} />

      {/*
        La tendina è trasparente e stesa sopra il nome: così la zona cliccabile
        è larga quanto il testo, mentre un `select` normale si dimensionerebbe
        sul nome più lungo del gruppo, lasciando uno stacco fino alla freccia.
      */}
      <span
        className={`relative inline-flex items-baseline gap-0.5 rounded-md border border-transparent px-1 hover:bg-fill focus-within:border-tint focus-within:ring-2 focus-within:ring-tint/25 ${
          pending ? "opacity-60" : ""
        }`}
      >
        <span className="font-medium text-tint">{selectedName}</span>
        <span aria-hidden className="text-[0.65rem]">
          ▾
        </span>

        <select
          name="payerId"
          aria-label="Cambia chi ha pagato"
          disabled={pending}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            formRef.current?.requestSubmit();
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-wait"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </span>

      {state.error && (
        <span className="ml-1 text-[12px] text-negative">{state.error}</span>
      )}
    </form>
  );
}
