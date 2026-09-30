import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeBalances, simplifyDebts } from "@/lib/balances";
import { buildOverview, type CurrencyOverview, type OverviewGroupInput } from "@/lib/overview";
import { GROUP_CASCADE_ORDER, type GroupTable } from "@/lib/group-cascade";
import type { KeywordOverride } from "@/lib/categories";

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
  if (memberships.length === 0) return [];

  // Un solo `groupBy` per tutti i gruppi dell'elenco: una query in più in
  // totale, non una per riga.
  const totals = await prisma.expense.groupBy({
    by: ["groupId"],
    where: { groupId: { in: memberships.map((membership) => membership.groupId) } },
    _sum: { amountCents: true },
  });
  // Un gruppo senza spese non compare fra i risultati: il suo totale è zero.
  const totalByGroup = new Map(totals.map((row) => [row.groupId, row._sum.amountCents ?? 0]));

  return memberships.map((membership) => ({
    membershipId: membership.id,
    role: membership.role,
    group: membership.group,
    totalCents: totalByGroup.get(membership.groupId) ?? 0,
  }));
}

/**
 * Quanto ha speso il gruppo in tutto.
 *
 * Sono le sole spese: un rimborso sposta denaro fra i membri, non è una
 * spesa del gruppo, e sommarlo conterebbe due volte le stesse uscite.
 *
 * Sta a parte da `getGroupForUser` perché quella la chiamano anche le
 * server action, che del totale non sanno che farsene.
 */
export async function getGroupExpenseTotal(groupId: string) {
  const { _sum } = await prisma.expense.aggregate({
    where: { groupId },
    _sum: { amountCents: true },
  });
  return _sum.amountCents ?? 0;
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

/**
 * Quanto ha speso il gruppo per categoria fra `start` (compreso) ed `end`
 * (escluso). Solo spese, come `getGroupExpenseTotal`: un rimborso sposta
 * denaro fra i membri, non è una spesa di nessuna categoria.
 */
export async function getCategoryTotals(groupId: string, start: Date, end: Date) {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { groupId, date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
  return rows.map((row) => ({ category: row.category, amountCents: row._sum.amountCents ?? 0 }));
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

/**
 * Il riepilogo dell'utente su tutti i suoi gruppi: quanto deve dare o ricevere
 * in tutto e qual è il saldo verso ogni persona con cui condivide un gruppo.
 *
 * Quattro query in tutto, non tre per gruppo: `getGroupBalances` risponde su un
 * gruppo solo, e chiamarla in ciclo qui vorrebbe dire moltiplicare le query per
 * il numero di gruppi. I dati arrivano tutti insieme con un `in` sugli id e si
 * raggruppano in memoria.
 */
export async function getUserOverview(userId: string): Promise<CurrencyOverview[]> {
  const memberships = await prisma.member.findMany({
    where: { userId, active: true },
    select: { groupId: true, group: { select: { id: true, name: true, currency: true } } },
    orderBy: { joinedAt: "asc" },
  });
  if (memberships.length === 0) return [];

  const groupIds = memberships.map((membership) => membership.groupId);
  const where = { groupId: { in: groupIds } };

  const [members, expenses, settlements] = await Promise.all([
    prisma.member.findMany({
      where,
      select: { id: true, groupId: true, name: true, userId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.expense.findMany({
      where,
      select: {
        groupId: true,
        payerId: true,
        amountCents: true,
        splits: { select: { memberId: true, amountCents: true } },
      },
    }),
    prisma.settlement.findMany({
      where,
      select: { groupId: true, fromMemberId: true, toMemberId: true, amountCents: true },
    }),
  ]);

  const byGroup = <T extends { groupId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const list = map.get(row.groupId);
      if (list) list.push(row);
      else map.set(row.groupId, [row]);
    }
    return map;
  };

  const membersByGroup = byGroup(members);
  const expensesByGroup = byGroup(expenses);
  const settlementsByGroup = byGroup(settlements);

  const input: OverviewGroupInput[] = [];
  for (const { group } of memberships) {
    const groupMembers = membersByGroup.get(group.id) ?? [];
    // Il membro con cui l'utente partecipa: senza, il gruppo non ha un punto di
    // vista da cui calcolare i saldi e va saltato.
    const viewer = groupMembers.find((member) => member.userId === userId);
    if (!viewer) continue;

    input.push({
      id: group.id,
      name: group.name,
      currency: group.currency,
      viewerMemberId: viewer.id,
      members: groupMembers,
      expenses: expensesByGroup.get(group.id) ?? [],
      settlements: settlementsByGroup.get(group.id) ?? [],
    });
  }

  return buildOverview(input);
}

/**
 * Spese del gruppo, dalla più recente. Senza `take` arrivano tutte: lo storico
 * le vuole tutte perché la ricerca, che filtra nel browser, deve poter trovare
 * anche le più vecchie.
 */
export async function listExpenses(groupId: string, take?: number) {
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

/**
 * Descrizione e categoria di ogni spesa del gruppo, dalla più recente: quanto
 * basta al riconoscimento automatico per imparare dallo storico e per sapere
 * quali spese sono ancora senza categoria.
 */
export async function listExpenseCategories(groupId: string) {
  return prisma.expense.findMany({
    where: { groupId },
    select: { id: true, description: true, category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Le correzioni del gruppo al dizionario delle parole chiave, da passare a
 * `buildDictionary`. Per quasi tutti i gruppi è un elenco vuoto o corto.
 */
export async function listCategoryKeywords(groupId: string): Promise<KeywordOverride[]> {
  return prisma.categoryKeyword.findMany({
    where: { groupId },
    select: { keyword: true, category: true },
    orderBy: { createdAt: "asc" },
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

/**
 * Tutte le operazioni del gruppo, spese e rimborsi, per l'export.
 * Qui non c'è un `take`: un export parziale sarebbe peggio di nessun export.
 */
export async function getGroupOperations(groupId: string) {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      select: {
        date: true,
        description: true,
        amountCents: true,
        note: true,
        category: true,
        payer: { select: { name: true } },
        // Serve solo chi partecipa alla spesa, non quanto gli tocca.
        splits: {
          select: { member: { select: { name: true } } },
          orderBy: { member: { name: "asc" } },
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.settlement.findMany({
      where: { groupId },
      select: {
        date: true,
        amountCents: true,
        note: true,
        from: { select: { name: true } },
        to: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return { expenses, settlements };
}

// ---------------------------------------------------------------------------
// Eliminazione di un gruppo
// ---------------------------------------------------------------------------

/**
 * Elimina un gruppo e tutto ciò che gli appartiene: quote, spese, rimborsi e
 * membri, nell'ordine dichiarato da `GROUP_CASCADE_ORDER`.
 *
 * Le cancellazioni stanno in una sola transazione, così o spariscono tutte o
 * non ne sparisce nessuna: un'eliminazione a metà lascerebbe spese senza
 * gruppo, cioè conti che non tornano più a nessuno.
 */
export async function deleteGroupCascade(groupId: string) {
  const svuota: Record<GroupTable, () => Prisma.PrismaPromise<unknown>> = {
    // Le quote non hanno un `groupId`: si raggiungono dalla spesa.
    expenseSplit: () => prisma.expenseSplit.deleteMany({ where: { expense: { groupId } } }),
    expense: () => prisma.expense.deleteMany({ where: { groupId } }),
    settlement: () => prisma.settlement.deleteMany({ where: { groupId } }),
    member: () => prisma.member.deleteMany({ where: { groupId } }),
    categoryKeyword: () => prisma.categoryKeyword.deleteMany({ where: { groupId } }),
    group: () => prisma.group.delete({ where: { id: groupId } }),
  };

  await prisma.$transaction(GROUP_CASCADE_ORDER.map((table) => svuota[table]()));
}
