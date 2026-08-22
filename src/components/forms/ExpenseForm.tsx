"use client";

import { useActionState, useMemo, useState } from "react";
import { createExpenseAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { computeSplits, SplitError, type SplitMode } from "@/lib/split";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export type FormMember = { id: string; name: string; shareWeight: number };

const modeHints: Record<SplitMode, string> = {
  EQUAL: "L'importo viene diviso in parti uguali fra i partecipanti selezionati.",
  SHARES: "L'importo viene diviso in proporzione alla quota di ogni membro.",
  EXACT: "Indica a mano quanto è a carico di ciascuno: la somma deve dare il totale.",
};

export function ExpenseForm({
  groupId,
  currency,
  members,
  defaultPayerId,
}: {
  groupId: string;
  currency: string;
  members: FormMember[];
  defaultPayerId: string;
}) {
  const [state, formAction] = useActionState(createExpenseAction, emptyActionState);

  const [amount, setAmount] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("EQUAL");
  const [selected, setSelected] = useState<string[]>(() => members.map((m) => m.id));
  const [exact, setExact] = useState<Record<string, string>>({});

  const totalCents = parseAmountToCents(amount) ?? 0;

  // Anteprima calcolata con la stessa funzione usata dal server.
  const preview = useMemo(() => {
    const participants = members
      .filter((member) => selected.includes(member.id))
      .map((member) => ({
        memberId: member.id,
        shareWeight: member.shareWeight,
        amountCents: parseAmountToCents(exact[member.id] ?? "") ?? 0,
      }));

    if (totalCents <= 0 || participants.length === 0) return null;

    try {
      const splits = computeSplits(totalCents, splitMode, participants);
      return { splits, error: null as string | null };
    } catch (error) {
      return { splits: [], error: error instanceof SplitError ? error.message : "Errore nel calcolo." };
    }
  }, [members, selected, exact, splitMode, totalCents]);

  const nameById = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members],
  );

  function toggle(memberId: string) {
    setSelected((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <Field label="Descrizione">
        <Input name="description" required maxLength={120} placeholder="Spesa supermercato" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Importo (${currency})`}>
          <Input
            name="amount"
            required
            inputMode="decimal"
            placeholder="52,40"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <Field label="Data">
          <Input name="date" type="date" defaultValue={today} />
        </Field>
      </div>

      <Field label="Ha pagato">
        <Select name="payerId" defaultValue={defaultPayerId} required>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Come si divide" hint={modeHints[splitMode]}>
        <Select
          name="splitMode"
          value={splitMode}
          onChange={(event) => setSplitMode(event.target.value as SplitMode)}
        >
          <option value="EQUAL">In parti uguali</option>
          <option value="SHARES">Per quote</option>
          <option value="EXACT">Importi esatti</option>
        </Select>
      </Field>

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Partecipanti
        </legend>

        {members.map((member) => {
          const checked = selected.includes(member.id);
          const share = preview?.splits.find((split) => split.memberId === member.id);

          return (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="participants"
                  value={member.id}
                  checked={checked}
                  onChange={() => toggle(member.id)}
                  className="size-4 accent-emerald-600"
                />
                <span className="font-medium">{member.name}</span>
                {splitMode === "SHARES" && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    quota {member.shareWeight}
                  </span>
                )}
              </label>

              {splitMode === "EXACT" && checked && (
                <Input
                  name={`exact-${member.id}`}
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-label={`Importo a carico di ${member.name}`}
                  className="w-28"
                  value={exact[member.id] ?? ""}
                  onChange={(event) =>
                    setExact((current) => ({ ...current, [member.id]: event.target.value }))
                  }
                />
              )}

              {splitMode !== "EXACT" && checked && share && (
                <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  {formatCents(share.amountCents, currency)}
                </span>
              )}
            </div>
          );
        })}
      </fieldset>

      {preview?.error && <Alert tone="error">{preview.error}</Alert>}

      {preview && !preview.error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Anteprima:{" "}
          {preview.splits
            .map((split) => `${nameById.get(split.memberId)} ${formatCents(split.amountCents, currency)}`)
            .join(" · ")}
        </p>
      )}

      <Field label="Nota (facoltativa)">
        <Input name="note" maxLength={200} placeholder="Spesa del mese" />
      </Field>

      <SubmitButton pendingLabel="Salvataggio…">Registra la spesa</SubmitButton>
    </form>
  );
}
