"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { baseKeywordCategory, CATEGORY_IDS, categoryLabel } from "@/lib/categories";
import { requireOwner } from "@/lib/group-access";
import { keywordSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/action-state";

/*
 * Le correzioni di un gruppo al dizionario delle parole chiave. Ogni parola ha
 * al più una riga (`@@unique([groupId, keyword])`), quindi ogni azione è un
 * upsert o una cancellazione di quella riga: vedi il modello `CategoryKeyword`.
 */

async function ownerGroup(formData: FormData, azione: string) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return requireOwner(String(formData.get("groupId") ?? ""), user.id, azione);
}

function revalidate(groupId: string) {
  revalidatePath(`/gruppi/${groupId}/categorie`);
  revalidatePath(`/gruppi/${groupId}/spese`);
}

function setKeyword(groupId: string, keyword: string, category: (typeof CATEGORY_IDS)[number] | null) {
  return prisma.categoryKeyword.upsert({
    where: { groupId_keyword: { groupId, keyword } },
    create: { groupId, keyword, category },
    update: { category },
  });
}

function resetKeyword(groupId: string, keyword: string) {
  return prisma.categoryKeyword.deleteMany({ where: { groupId, keyword } });
}

/**
 * Dà una categoria a una parola: la aggiunge, oppure la sposta se il gruppo o
 * il dizionario di base l'avevano già messa altrove. Se la categoria è proprio
 * quella del dizionario di base non c'è niente da correggere, e la riga del
 * gruppo si cancella invece di ripetere la base.
 */
export async function saveKeywordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const group = await ownerGroup(formData, "salva_parola_chiave");
  if (!group) return { error: "Gruppo non trovato." };

  const parsedKeyword = keywordSchema.safeParse(formData.get("keyword") ?? "");
  if (!parsedKeyword.success) return { error: parsedKeyword.error.issues[0].message };
  const parsedCategory = z.enum(CATEGORY_IDS).safeParse(formData.get("category"));
  if (!parsedCategory.success) return { error: "Scegli una categoria." };

  const keyword = parsedKeyword.data;
  const category = parsedCategory.data;

  if (baseKeywordCategory(keyword) === category) await resetKeyword(group.id, keyword);
  else await setKeyword(group.id, keyword, category);

  revalidate(group.id);
  return { success: `«${keyword}» ora indica ${categoryLabel(category)}.` };
}

/**
 * Toglie una parola dalla sua categoria. Una parola del dizionario di base
 * resta registrata come disattivata, così si può riattivare; una aggiunta dal
 * gruppo sparisce e basta.
 *
 * Risponde senza stato: la chiamano i pulsanti accanto a ogni parola, che non
 * hanno dove mostrare un messaggio. L'unico rifiuto possibile è quello dei
 * permessi, e finisce nel log.
 */
export async function removeKeywordAction(formData: FormData): Promise<void> {
  const group = await ownerGroup(formData, "togli_parola_chiave");
  const parsed = keywordSchema.safeParse(formData.get("keyword") ?? "");
  if (!group || !parsed.success) return;

  if (baseKeywordCategory(parsed.data)) await setKeyword(group.id, parsed.data, null);
  else await resetKeyword(group.id, parsed.data);
  revalidate(group.id);
}

/** Riporta una parola a com'è nel dizionario di base. */
export async function restoreKeywordAction(formData: FormData): Promise<void> {
  const group = await ownerGroup(formData, "riattiva_parola_chiave");
  const parsed = keywordSchema.safeParse(formData.get("keyword") ?? "");
  if (!group || !parsed.success) return;

  await resetKeyword(group.id, parsed.data);
  revalidate(group.id);
}
