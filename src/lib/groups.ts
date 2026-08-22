import { prisma } from "@/lib/db";
import { computeBalances, simplifyDebts } from "@/lib/balances";

/** Codice di invito leggibile, senza caratteri ambigui (0/O, 1/I). */
export function generateInviteCode(length = 7): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** I gruppi di cui l'utente fa parte, con qualche numero di riepilogo. */
export async function listGroupsForUser(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId, active: true },
    include: {
      group: {
        include: {
          _count: { select: { members: true, expenses: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    role: membership.role,
    group: membership.group,
  }));
}

/**
 * Carica un gruppo verificando che l'utente ne faccia parte.
 * Restituisce `null` se il gruppo non esiste o l'utente non è un membro:
 * chi chiama deve tradurlo in un 404, senza rivelare l'esistenza del gruppo.
 */
export async function getGroupForUser(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: [{ active: "desc" }, { joinedAt: "asc" }] },
    },
  });
  if (!group) return null;

  const viewer = group.members.find((member) => member.userId === userId && member.active);
  if (!viewer) return null;

  return { ...group, viewer };
}

/** Saldi del gruppo e pagamenti minimi per pareggiare i conti. */
export async function getGroupBalances(groupId: string) {
  const [members, expenses, settlements] = await Promise.all([
    prisma.member.findMany({ where: { groupId }, orderBy: { joinedAt: "asc" } }),
    prisma.expense.findMany({
      where: { groupId },
      select: { payerId: true, amountCents: true, splits: { select: { memberId: true, amountCents: true } } },
    }),
    prisma.settlement.findMany({
      where: { groupId },
      select: { fromMemberId: true, toMemberId: true, amountCents: true },
    }),
  ]);

  const balances = computeBalances(
    members.map((member) => ({ id: member.id, name: member.name })),
    expenses,
    settlements,
  );

  // I membri disattivati compaiono solo finché hanno ancora conti in sospeso.
  const activeIds = new Set(members.filter((m) => m.active).map((m) => m.id));
  const visible = balances.filter((b) => activeIds.has(b.memberId) || b.netCents !== 0);

  return { balances: visible, debts: simplifyDebts(balances) };
}

/** Spese del gruppo, dalla più recente. */
export async function listExpenses(groupId: string, take = 50) {
  return prisma.expense.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true } },
      splits: { include: { member: { select: { id: true, name: true } } } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
}

/** Rimborsi registrati nel gruppo, dal più recente. */
export async function listSettlements(groupId: string, take = 50) {
  return prisma.settlement.findMany({
    where: { groupId },
    include: {
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
}
