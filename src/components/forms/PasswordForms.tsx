"use client";

import { useActionState } from "react";
import {
  cambiaPasswordAction,
  reimpostaPasswordAction,
  richiediResetAction,
} from "@/app/actions/password";
import { emptyActionState } from "@/lib/action-state";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * I due campi della password nuova, uguali nel reset e nel cambio.
 *
 * L'email c'è ma non si vede: senza un campo `username` accanto a quelli della
 * password, i gestori di password non sanno a quale account appartiene quella
 * nuova e non si offrono di aggiornarla. Non viene inviato a nessuno — il
 * server sa già di chi è la password, dal token o dalla sessione.
 */
function CampiNuovaPassword({ email }: { email: string }) {
  return (
    <>
      <input type="text" autoComplete="username" value={email} readOnly hidden />

      <Field label="Nuova password" hint="Almeno 8 caratteri.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <Field label="Ripeti la nuova password">
        <Input name="conferma" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
    </>
  );
}

export function RichiediResetForm() {
  const [state, formAction] = useActionState(richiediResetAction, emptyActionState);

  // A richiesta accettata il form sparisce: lasciarlo lì inviterebbe a
  // premere di nuovo, e la seconda richiesta ravvicinata non spedisce nulla.
  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <SubmitButton pendingLabel="Invio in corso…" className="w-full">
        Mandami il collegamento
      </SubmitButton>
    </form>
  );
}

export function ReimpostaPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(reimpostaPasswordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="token" value={token} />
      <CampiNuovaPassword email={email} />

      <SubmitButton pendingLabel="Salvataggio…" className="w-full">
        Salva la nuova password
      </SubmitButton>
    </form>
  );
}

export function CambiaPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(cambiaPasswordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <Field label="Password attuale">
        <Input name="attuale" type="password" autoComplete="current-password" required />
      </Field>

      <CampiNuovaPassword email={email} />

      <SubmitButton pendingLabel="Salvataggio…">Cambia la password</SubmitButton>
    </form>
  );
}
