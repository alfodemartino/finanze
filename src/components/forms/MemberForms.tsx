"use client";

import { useActionState } from "react";
import {
  addMemberAction,
  deactivateMemberAction,
  regenerateInviteCodeAction,
  updateMemberAction,
} from "@/app/actions/groups";
import { emptyActionState } from "@/lib/action-state";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(addMemberAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <Field
        label="Nome"
        hint="Puoi aggiungere anche chi non ha un account: parteciperà comunque alla divisione."
      >
        <Input name="name" required maxLength={60} placeholder="Marco" />
      </Field>

      <Field label="Quota" hint="Peso usato dalla divisione «per quote». Con 60 e 40 ottieni un 60/40.">
        <Input name="shareWeight" type="number" min={0} max={1000} defaultValue={100} />
      </Field>

      <SubmitButton pendingLabel="Aggiungo…">Aggiungi il membro</SubmitButton>
    </form>
  );
}

export function MemberRow({
  groupId,
  member,
  canManage,
}: {
  groupId: string;
  member: { id: string; name: string; shareWeight: number; role: string; active: boolean; hasAccount: boolean };
  canManage: boolean;
}) {
  const [updateState, updateFormAction] = useActionState(updateMemberAction, emptyActionState);
  const [removeState, removeFormAction] = useActionState(deactivateMemberAction, emptyActionState);

  if (!canManage) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
        <span className="font-medium">
          {member.name}
          {!member.active && <span className="ml-2 text-xs text-slate-400">non attivo</span>}
        </span>
        <span className="text-slate-500 dark:text-slate-400">quota {member.shareWeight}</span>
      </li>
    );
  }

  return (
    <li className="space-y-2 py-3">
      <form action={updateFormAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="memberId" value={member.id} />

        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Nome</span>
          <Input name="name" defaultValue={member.name} required maxLength={60} />
        </label>

        <label className="w-24 text-sm">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Quota</span>
          <Input name="shareWeight" type="number" min={0} max={1000} defaultValue={member.shareWeight} />
        </label>

        <SubmitButton variant="secondary" pendingLabel="Salvo…">
          Salva
        </SubmitButton>
      </form>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {member.role === "OWNER" ? "amministratore" : "membro"}
          {member.hasAccount ? " · con account" : " · senza account"}
          {!member.active && " · non attivo"}
        </span>

        {member.active && (
          <form action={removeFormAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="memberId" value={member.id} />
            <SubmitButton variant="danger" className="px-2 py-1 text-xs" pendingLabel="Rimuovo…">
              Rimuovi dal gruppo
            </SubmitButton>
          </form>
        )}
      </div>

      {updateState.error && <Alert tone="error">{updateState.error}</Alert>}
      {removeState.error && <Alert tone="error">{removeState.error}</Alert>}
    </li>
  );
}

export function InviteCodeForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState(regenerateInviteCodeAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <SubmitButton variant="ghost" className="px-2 py-1 text-xs" pendingLabel="Genero…">
        Genera un nuovo codice
      </SubmitButton>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
    </form>
  );
}
