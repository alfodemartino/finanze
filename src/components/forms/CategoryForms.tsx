"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { categorizeExpensesAction, updateExpenseCategoryAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { CATEGORIES, CATEGORY_IDS, categoryLabel, type ExpenseCategory } from "@/lib/categories";
import { useLoadingWhile } from "@/components/LoadingOverlay";
import { SubmitButton } from "@/components/SubmitButton";

/** Le voci di una tendina delle categorie: la prima è «Senza categoria». */
export function CategoryOptions() {
  return (
    <>
      <option value="">{categoryLabel(null)}</option>
      {CATEGORY_IDS.map((id) => (
        <option key={id} value={id}>
          {CATEGORIES[id].label}
        </option>
      ))}
    </>
  );
}

/**
 * La categoria di una spesa già registrata, che nello storico è una tendina:
 * si sceglie e la spesa viene salvata subito, come per il pagatore. Sembra
 * testo finché non ci si passa sopra, così lo storico resta leggibile.
 */
export function CategorySelect({
  groupId,
  expenseId,
  category,
}: {
  groupId: string;
  expenseId: string;
  category: ExpenseCategory | null;
}) {
  const [state, formAction, pending] = useActionState(updateExpenseCategoryAction, emptyActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState<string>(category ?? "");

  useLoadingWhile(pending);

  // La categoria arriva dal server: dopo il salvataggio la tendina segue quella
  // appena confermata e, se la modifica fallisce, torna su quella di prima.
  useEffect(() => setValue(category ?? ""), [category, state]);

  return (
    <form ref={formRef} action={formAction} className="inline">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="expenseId" value={expenseId} />

      {/* La tendina trasparente stesa sopra il nome, come in `PayerSelect`.
          Qui apre la riga: il margine negativo riallinea il testo a quello
          delle righe sotto, e il riquadro al passaggio sporge a sinistra. */}
      <span
        className={`relative -ml-1 inline-flex items-baseline gap-0.5 rounded-md border border-transparent px-1 hover:bg-fill focus-within:border-tint focus-within:ring-2 focus-within:ring-tint/25 ${
          pending ? "opacity-60" : ""
        }`}
      >
        <span className="font-medium text-tint">
          {categoryLabel((value || null) as ExpenseCategory | null)}
        </span>
        <span aria-hidden className="text-[0.65rem] text-tint">
          ▾
        </span>

        <select
          name="category"
          aria-label="Cambia la categoria"
          disabled={pending}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            formRef.current?.requestSubmit();
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-wait"
        >
          <CategoryOptions />
        </select>
      </span>

      {state.error && <span className="ml-1 text-[12px] text-negative">{state.error}</span>}
    </form>
  );
}

/**
 * La riga in cima allo storico che propone di categorizzare in un colpo le
 * spese senza categoria che la descrizione permette di riconoscere. Compare
 * solo quando ce n'è almeno una: sistemate quelle, sparisce da sola.
 */
export function CategorizeBanner({
  groupId,
  uncategorized,
  recognizable,
}: {
  groupId: string;
  /** Le spese senza categoria. */
  uncategorized: number;
  /** Quante di queste il riconoscimento automatico sa categorizzare. */
  recognizable: number;
}) {
  const [state, formAction] = useActionState(categorizeExpensesAction, emptyActionState);

  const rest = uncategorized - recognizable;
  const text = [
    uncategorized === 1 ? "1 spesa è senza categoria: " : `${uncategorized} spese sono senza categoria: `,
    rest === 0
      ? uncategorized === 1
        ? "si riconosce dalla descrizione."
        : "si riconoscono tutte dalla descrizione."
      : `${recognizable === 1 ? "1 si riconosce" : `${recognizable} si riconoscono`} dalla descrizione, ${
          rest === 1 ? "l'altra va scelta" : "le altre vanno scelte"
        } a mano.`,
  ].join("");

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-separator px-4 py-3"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <p className="min-w-0 flex-1 basis-56 text-[13px] text-label-secondary">
        {text}
        {state.error && <span className="ml-1 text-negative">{state.error}</span>}
      </p>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Categorizzo…">
        Categorizza
      </SubmitButton>
    </form>
  );
}
