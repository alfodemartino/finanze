"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { generateInviteCode, getGroupForUser } from "@/lib/groups";
import { groupSchema, inviteCodeSchema, memberSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/action-state";

async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Carica il gruppo e pretende che l'utente ne sia amministratore. */
async function requireOwner(groupId: string, userId: string) {
  const group = await getGroupForUser(groupId, userId);
  if (!group) return null;
  if (group.viewer.role !== "OWNER") return null;
  return group;
}

export async function createGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") || "EUR",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      currency: parsed.data.currency,
      inviteCode: generateInviteCode(),
      members: {
        create: {
          userId: user.id,
          name: user.name?.trim() || user.email || "Io",
          role: "OWNER",
        },
      },
    },
  });

  revalidatePath("/gruppi");
  redirect(`/gruppi/${group.id}`);
}

export async function joinGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = inviteCodeSchema.safeParse(formData.get("inviteCode"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Codice non valido." };
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data },
    include: { members: true },
  });
  if (!group) {
    return { error: "Nessun gruppo trovato con questo codice." };
  }

  const existing = group.members.find((member) => member.userId === user.id);
  if (existing) {
    if (!existing.active) {
      await prisma.member.update({ where: { id: existing.id }, data: { active: true } });
    }
    redirect(`/gruppi/${group.id}`);
  }

  // Se qualcuno aveva già creato un segnaposto con lo stesso nome, lo si
  // collega all'account invece di duplicare il membro.
  const displayName = user.name?.trim() || user.email || "Nuovo membro";
  const placeholder = group.members.find(
    (member) => member.userId === null && member.name.toLowerCase() === displayName.toLowerCase(),
  );

  if (placeholder) {
    await prisma.member.update({
      where: { id: placeholder.id },
      data: { userId: user.id, active: true },
    });
  } else {
    await prisma.member.create({
      data: { groupId: group.id, userId: user.id, name: displayName },
    });
  }

  revalidatePath("/gruppi");
  redirect(`/gruppi/${group.id}`);
}

export async function addMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");

  const group = await requireOwner(groupId, user.id);
  if (!group) return { error: "Non hai i permessi per modificare questo gruppo." };

  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    shareWeight: formData.get("shareWeight") || 100,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const duplicate = group.members.some(
    (member) => member.active && member.name.toLowerCase() === parsed.data.name.toLowerCase(),
  );
  if (duplicate) {
    return { error: "C'è già un membro con questo nome nel gruppo." };
  }

  await prisma.member.create({
    data: {
      groupId,
      name: parsed.data.name,
      shareWeight: parsed.data.shareWeight,
    },
  });

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/membri`);
  return { success: `${parsed.data.name} è stato aggiunto al gruppo.` };
}

export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const group = await requireOwner(groupId, user.id);
  if (!group) return { error: "Non hai i permessi per modificare questo gruppo." };

  const member = group.members.find((m) => m.id === memberId);
  if (!member) return { error: "Membro non trovato." };

  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    shareWeight: formData.get("shareWeight"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { name: parsed.data.name, shareWeight: parsed.data.shareWeight },
  });

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/membri`);
  return { success: "Membro aggiornato." };
}

/**
 * Disattiva un membro. Non lo cancella: le spese passate devono restare
 * coerenti, e un membro con saldo diverso da zero resta visibile nei conti.
 */
export async function deactivateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  const group = await requireOwner(groupId, user.id);
  if (!group) return { error: "Non hai i permessi per modificare questo gruppo." };

  const member = group.members.find((m) => m.id === memberId);
  if (!member) return { error: "Membro non trovato." };

  const owners = group.members.filter((m) => m.active && m.role === "OWNER");
  if (member.role === "OWNER" && owners.length <= 1) {
    return { error: "Il gruppo deve avere almeno un amministratore." };
  }

  const involved = await prisma.expense.count({
    where: { groupId, OR: [{ payerId: memberId }, { splits: { some: { memberId } } }] },
  });

  if (involved === 0) {
    await prisma.member.delete({ where: { id: memberId } });
  } else {
    await prisma.member.update({ where: { id: memberId }, data: { active: false } });
  }

  revalidatePath(`/gruppi/${groupId}`);
  revalidatePath(`/gruppi/${groupId}/membri`);
  return { success: `${member.name} non partecipa più alle nuove spese.` };
}

/** Rigenera il codice di invito, per esempio se è stato condiviso per errore. */
export async function regenerateInviteCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");

  const group = await requireOwner(groupId, user.id);
  if (!group) return { error: "Non hai i permessi per modificare questo gruppo." };

  await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: generateInviteCode() },
  });

  revalidatePath(`/gruppi/${groupId}/membri`);
  return { success: "Nuovo codice di invito generato." };
}
