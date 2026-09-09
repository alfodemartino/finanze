/**
 * Calcolo dei saldi di un gruppo e semplificazione dei debiti.
 *
 * Funzioni pure: nessun accesso al database, così sono facili da testare.
 */

export type BalanceInputMember = { id: string; name: string };

export type BalanceInputExpense = {
  payerId: string;
  amountCents: number;
  splits: { memberId: string; amountCents: number }[];
};

export type BalanceInputSettlement = {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
};

export type MemberBalance = {
  memberId: string;
  name: string;
  /** Quanto il membro ha anticipato per il gruppo. */
  paidCents: number;
  /** Quanto è a suo carico in base alla ripartizione delle spese. */
  owedCents: number;
  /** Rimborsi versati ad altri membri. */
  settledOutCents: number;
  /** Rimborsi ricevuti da altri membri. */
  settledInCents: number;
  /** Positivo: deve ricevere. Negativo: deve dare. */
  netCents: number;
};

export type Debt = {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amountCents: number;
};

/** Saldo di ogni membro: quanto ha anticipato, quanto gli spetta, quanto resta. */
export function computeBalances(
  members: BalanceInputMember[],
  expenses: BalanceInputExpense[],
  settlements: BalanceInputSettlement[] = [],
): MemberBalance[] {
  const balances = new Map<string, MemberBalance>(
    members.map((m) => [
      m.id,
      {
        memberId: m.id,
        name: m.name,
        paidCents: 0,
        owedCents: 0,
        settledOutCents: 0,
        settledInCents: 0,
        netCents: 0,
      },
    ]),
  );

  for (const expense of expenses) {
    const payer = balances.get(expense.payerId);
    if (payer) payer.paidCents += expense.amountCents;

    for (const split of expense.splits) {
      const member = balances.get(split.memberId);
      if (member) member.owedCents += split.amountCents;
    }
  }

  for (const settlement of settlements) {
    const from = balances.get(settlement.fromMemberId);
    const to = balances.get(settlement.toMemberId);
    if (from) from.settledOutCents += settlement.amountCents;
    if (to) to.settledInCents += settlement.amountCents;
  }

  for (const balance of balances.values()) {
    balance.netCents =
      balance.paidCents + balance.settledOutCents - balance.owedCents - balance.settledInCents;
  }

  return members.map((m) => balances.get(m.id)!);
}

/**
 * Riduce i saldi al minor numero possibile di pagamenti.
 *
 * Strategia greedy: a ogni passo il debitore più esposto paga il creditore
 * con il credito più alto. Produce al massimo n-1 pagamenti per n membri.
 */
export function simplifyDebts(balances: MemberBalance[]): Debt[] {
  const names = new Map(balances.map((b) => [b.memberId, b.name]));

  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ memberId: b.memberId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId));

  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ memberId: b.memberId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId));

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      debts.push({
        fromMemberId: debtor.memberId,
        fromName: names.get(debtor.memberId) ?? "?",
        toMemberId: creditor.memberId,
        toName: names.get(creditor.memberId) ?? "?",
        amountCents: amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i += 1;
    if (creditor.amount === 0) j += 1;
  }

  return debts;
}

/** Saldo di un membro nei confronti di un altro, visto da chi guarda. */
export type PairwiseBalance = {
  memberId: string;
  name: string;
  /** Positivo: quel membro deve dare a chi guarda. Negativo: il contrario. */
  netCents: number;
};

/**
 * Saldo reale fra chi guarda e ogni altro membro del gruppo.
 *
 * È un'altra domanda rispetto a `simplifyDebts`: lì si cerca il giro di
 * bonifici più corto per pareggiare il gruppo, e per farlo si può chiedere a
 * Bruno di pagare Carla anche se fra loro non c'è mai stata una spesa. Qui si
 * risponde invece a «quanto devo a questa persona», ricostruendolo da chi ha
 * anticipato per chi.
 *
 * La somma dei saldi verso gli altri è esattamente il `netCents` di chi guarda:
 * è l'invariante verificata dai test, ed è ciò che tiene insieme il totale del
 * riepilogo e l'elenco per persona che gli sta sotto.
 */
export function computePairwiseBalances(
  viewerId: string,
  members: BalanceInputMember[],
  expenses: BalanceInputExpense[],
  settlements: BalanceInputSettlement[] = [],
): PairwiseBalance[] {
  const others = new Map<string, PairwiseBalance>(
    members
      .filter((m) => m.id !== viewerId)
      .map((m) => [m.id, { memberId: m.id, name: m.name, netCents: 0 }]),
  );

  for (const expense of expenses) {
    if (expense.payerId === viewerId) {
      // Ho anticipato io: ogni altro partecipante mi deve la sua quota. La mia
      // la salto, non ho debiti verso me stesso.
      for (const split of expense.splits) {
        const other = others.get(split.memberId);
        if (other) other.netCents += split.amountCents;
      }
    } else {
      // Ha anticipato un altro: gli devo la mia quota, e solo quella.
      const payer = others.get(expense.payerId);
      if (!payer) continue;
      for (const split of expense.splits) {
        if (split.memberId === viewerId) payer.netCents -= split.amountCents;
      }
    }
  }

  for (const settlement of settlements) {
    if (settlement.fromMemberId === viewerId) {
      const other = others.get(settlement.toMemberId);
      if (other) other.netCents += settlement.amountCents;
    } else if (settlement.toMemberId === viewerId) {
      const other = others.get(settlement.fromMemberId);
      if (other) other.netCents -= settlement.amountCents;
    }
  }

  return members.filter((m) => m.id !== viewerId).map((m) => others.get(m.id)!);
}
