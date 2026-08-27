"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { parseAmountToCents } from "@/lib/money";
import { computeSplits, SplitError, type SplitParticipant } from "@/lib/split";
import { splitModeSchema } from "@/lib/validation";
import { logEvent } from "@/lib/log";
import { clientIp } from "@/lib/request-ip";
import type { ActionState } from "@/lib/action-state";

/**
 * Carica il gruppo solo se chi chiede ne fa parte. A chi non ne fa parte l'app
 * risponde come se il gruppo non esistesse — non si rivela nemmeno la sua
 * esistenza — ma nei log la differenza si vede, ed è il punto: un id di gruppo
 * altrui in un form non ci arriva per sbaglio. `azione` dice cosa si stava
 * tentando.
 */
async function requireMembership(groupId: string, azione: string) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(groupId, user.id);
  if (!group) {
    logEvent("warn", "gruppo_non_accessibile", {
      gruppo: groupId,
      utente: user.id,
      azione,
      ip: await clientIp(),
    });
  }
  return group;
}

function parseDate(value: FormDataEntryValue | null): Date {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const group = await requireMembership(groupId, "crea_spesa");
  if (!group) return { error: "Gruppo non trovato." };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Aggiungi una descrizione alla spesa." };

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null || amountCents <= 0) {
    return { error: "Inserisci un importo valido, maggiore di zero." };
  }

  const payerId = String(formData.get("payerId") ?? "");
  const payer = group.members.find((member) => member.id === payerId);
  if (!payer) return { error: "Seleziona chi ha pagato." };

  const parsedMode = splitModeSchema.safeParse(formData.get("splitMode"));
  if (!parsedMode.success) return { error: "Modalità di divisione non valida." };
  const splitMode = parsedMode.data;

  const selectedIds = formData.getAll("participants").map(String);
  const participants = group.members.filter((member) => selectedIds.includes(member.id));
  if (participants.length === 0) {
    return { error: "Scegli almeno un partecipante alla spesa." };
  }

  const splitInput: SplitParticipant[] = participants.map((member) => ({
    memberId: member.id,
    shareWeight: member.shareWeight,
    amountCents: parseAmountToCents(String(formData.get(`exact-${member.id}`) ?? "")) ?? 0,
  }));

  let splits;
  try {
    splits = computeSplits(amountCents, splitMode, splitInput);
  } catch (error) {
    if (error instanceof SplitError) {
      // Di solito è un importo esatto che non somma al totale, cioè un errore
      // di chi compila. Ma è anche il punto in cui affiorerebbe un difetto
      // nella ripartizione, che è la parte che non deve sbagliare: perciò si
      // registra con il totale e la modalità, abbastanza per riprodurlo.
      logEvent("warn", "quote_non_valide", {
        gruppo: groupId,
        modalita: splitMode,
        totale_centesimi: amountCents,
        partecipanti: participants.length,
        motivo: error.message,
      });
      return { error: error.message };
    }
    throw error;
  }

  await prisma.expense.create({
    data: {
      groupId,
      description,
      amountCents,
      date: parseDate(formData.get("date")),
      splitMode,
      payerId,
      note: String(formData.get("note") ?? "").trim() || null,
      splits: { createMany: { data: splits } },
    },
  });

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/spese`);
  return { success: "Spesa registrata." };
}

/**
 * Cambia chi ha anticipato una spesa già registrata.
 *
 * Le quote a carico dei partecipanti non dipendono dal pagatore, quindi
 * restano quelle: a cambiare sono i saldi, che vengono ricalcolati a ogni
 * lettura da `computeBalances`. Basta quindi invalidare le pagine che li
 * mostrano.
 */
export async function updateExpensePayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const expenseId = String(formData.get("expenseId") ?? "");

  const group = await requireMembership(groupId, "cambia_pagatore");
  if (!group) return { error: "Gruppo non trovato." };
  if (group.viewer.role !== "OWNER") {
    return { error: "Solo un amministratore può cambiare il pagatore." };
  }

  const payerId = String(formData.get("payerId") ?? "");
  const payer = group.members.find((member) => member.id === payerId && member.active);
  if (!payer) return { error: "Seleziona chi ha pagato." };

  // Come per la cancellazione, il vincolo sul gruppo impedisce di toccare la
  // spesa di un altro gruppo passando un id arbitrario nel form.
  const updated = await prisma.expense.updateMany({
    where: { id: expenseId, groupId },
    data: { payerId },
  });
  if (updated.count === 0) {
    // Il vincolo sul gruppo ha respinto la riga: o un doppio invio su
    // qualcosa di già eliminato, o un id che non appartiene a questo gruppo.
    logEvent("warn", "riga_non_trovata", {
      gruppo: groupId,
      tipo: "spesa",
      riga: expenseId,
      azione: "cambia_pagatore",
    });
    return { error: "Spesa non trovata." };
  }

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/spese`);
  revalidatePath(`/gruppi/${groupId}/saldi`);
  return { success: `Ora la spesa risulta pagata da ${payer.name}.` };
}

export async function deleteExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const expenseId = String(formData.get("expenseId") ?? "");

  const group = await requireMembership(groupId, "elimina_spesa");
  if (!group) return { error: "Gruppo non trovato." };

  // `deleteMany` con il vincolo sul gruppo evita di cancellare la spesa di
  // un altro gruppo passando un id arbitrario nel form.
  const deleted = await prisma.expense.deleteMany({ where: { id: expenseId, groupId } });
  if (deleted.count === 0) {
    // Il vincolo sul gruppo ha respinto la riga: o un doppio invio su
    // qualcosa di già eliminato, o un id che non appartiene a questo gruppo.
    logEvent("warn", "riga_non_trovata", {
      gruppo: groupId,
      tipo: "spesa",
      riga: expenseId,
      azione: "elimina_spesa",
    });
    return { error: "Spesa non trovata." };
  }

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/spese`);
  return { success: "Spesa eliminata." };
}

export async function createSettlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const group = await requireMembership(groupId, "crea_rimborso");
  if (!group) return { error: "Gruppo non trovato." };

  const fromMemberId = String(formData.get("fromMemberId") ?? "");
  const toMemberId = String(formData.get("toMemberId") ?? "");

  if (fromMemberId === toMemberId) {
    return { error: "Chi paga e chi riceve devono essere due persone diverse." };
  }

  const from = group.members.find((member) => member.id === fromMemberId);
  const to = group.members.find((member) => member.id === toMemberId);
  if (!from || !to) return { error: "Seleziona chi paga e chi riceve." };

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null || amountCents <= 0) {
    return { error: "Inserisci un importo valido, maggiore di zero." };
  }

  await prisma.settlement.create({
    data: {
      groupId,
      fromMemberId,
      toMemberId,
      amountCents,
      date: parseDate(formData.get("date")),
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/saldi`);
  return { success: `Rimborso registrato: ${from.name} → ${to.name}.` };
}

export async function deleteSettlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const settlementId = String(formData.get("settlementId") ?? "");

  const group = await requireMembership(groupId, "elimina_rimborso");
  if (!group) return { error: "Gruppo non trovato." };

  const deleted = await prisma.settlement.deleteMany({ where: { id: settlementId, groupId } });
  if (deleted.count === 0) {
    // Il vincolo sul gruppo ha respinto la riga: o un doppio invio su
    // qualcosa di già eliminato, o un id che non appartiene a questo gruppo.
    logEvent("warn", "riga_non_trovata", {
      gruppo: groupId,
      tipo: "rimborso",
      riga: settlementId,
      azione: "elimina_rimborso",
    });
    return { error: "Rimborso non trovato." };
  }

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/saldi`);
  return { success: "Rimborso eliminato." };
}
