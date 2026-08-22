"use client";

import { useActionState } from "react";
import { createSettlementAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function SettlementForm({
  groupId,
  currency,
  members,
  defaultFromId,
  defaultToId,
  defaultAmount,
}: {
  groupId: string;
  currency: string;
  members: { id: string; name: string }[];
  defaultFromId?: string;
  defaultToId?: string;
  defaultAmount?: string;
}) {
  const [state, formAction] = useActionState(createSettlementAction, emptyActionState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chi paga">
          <Select name="fromMemberId" defaultValue={defaultFromId} required>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Chi riceve">
          <Select name="toMemberId" defaultValue={defaultToId} required>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Importo (${currency})`}>
          <Input name="amount" required inputMode="decimal" placeholder="25,00" defaultValue={defaultAmount} />
        </Field>

        <Field label="Data">
          <Input name="date" type="date" defaultValue={today} />
        </Field>
      </div>

      <Field label="Nota (facoltativa)">
        <Input name="note" maxLength={200} placeholder="Bonifico del 3 marzo" />
      </Field>

      <SubmitButton pendingLabel="Salvataggio…">Registra il rimborso</SubmitButton>
    </form>
  );
}
