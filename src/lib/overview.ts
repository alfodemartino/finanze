/**
 * Riepilogo trasversale ai gruppi: quanto l'utente deve dare o ricevere in
 * tutto, e qual è il suo saldo verso ogni persona con cui condivide un gruppo.
 *
 * Funzione pura come il resto di `src/lib/`: riceve i dati già caricati, così
 * si prova senza database. Il caricamento sta in `getUserOverview`.
 */

import {
  computePairwiseBalances,
  type BalanceInputExpense,
  type BalanceInputSettlement,
} from "@/lib/balances";

export type OverviewMember = { id: string; name: string; userId: string | null };

export type OverviewGroupInput = {
  id: string;
  name: string;
  currency: string;
  /** Il `Member` con cui l'utente partecipa a questo gruppo. */
  viewerMemberId: string;
  members: OverviewMember[];
  expenses: BalanceInputExpense[];
  settlements: BalanceInputSettlement[];
};

export type PersonBalance = {
  /** `user:<id>` per chi ha un account, `member:<id>` per chi non ce l'ha. */
  key: string;
  name: string;
  /** Positivo: quella persona deve dare all'utente. */
  netCents: number;
  /** I gruppi da cui viene il saldo, in ordine di iscrizione. */
  groups: { id: string; name: string }[];
};

export type CurrencyOverview = {
  currency: string;
  /** `toReceiveCents - toPayCents`: positivo se in tutto l'utente deve ricevere. */
  netCents: number;
  toReceiveCents: number;
  toPayCents: number;
  /** Gruppi in cui l'utente ha ancora conti aperti in questa valuta. */
  groupCount: number;
  people: PersonBalance[];
};

/**
 * La stessa persona in due gruppi sono due `Member` distinti: si riconoscono
 * solo dallo stesso `userId`. Chi non ha un account resta una riga per gruppo —
 * accorpare per nome sommerebbe due «Marco» che non sono la stessa persona.
 */
function personKey(member: OverviewMember): string {
  return member.userId ? `user:${member.userId}` : `member:${member.id}`;
}

/**
 * Costruisce il riepilogo, un blocco per valuta.
 *
 * Le valute non si sommano mai fra loro: `Group.currency` è per gruppo, e un
 * totale che mescolasse euro e sterline sarebbe un numero senza significato.
 * Nel caso normale — tutti i gruppi in euro — il risultato ha un blocco solo.
 *
 * I totali si ricavano dalle persone elencate, non dai saldi di gruppo: così i
 * numeri in cima e le righe sotto non possono raccontare cose diverse.
 */
export function buildOverview(groups: OverviewGroupInput[]): CurrencyOverview[] {
  // `Map` e non oggetto: conserva l'ordine di inserimento, che qui è l'ordine
  // di iscrizione ai gruppi. La valuta usata più a lungo compare per prima.
  const byCurrency = new Map<string, Map<string, PersonBalance>>();

  for (const group of groups) {
    const balances = computePairwiseBalances(
      group.viewerMemberId,
      group.members.map((member) => ({ id: member.id, name: member.name })),
      group.expenses,
      group.settlements,
    );
    const membersById = new Map(group.members.map((member) => [member.id, member]));

    let people = byCurrency.get(group.currency);
    if (!people) {
      people = new Map<string, PersonBalance>();
      byCurrency.set(group.currency, people);
    }

    for (const balance of balances) {
      // Un compagno di gruppo con cui i conti sono in pari non aggiunge nulla:
      // né all'importo, né all'elenco dei gruppi da cui viene il saldo.
      if (balance.netCents === 0) continue;

      const member = membersById.get(balance.memberId);
      if (!member) continue;

      const key = personKey(member);
      const person = people.get(key);
      if (person) {
        person.netCents += balance.netCents;
        person.groups.push({ id: group.id, name: group.name });
      } else {
        people.set(key, {
          key,
          name: balance.name,
          netCents: balance.netCents,
          groups: [{ id: group.id, name: group.name }],
        });
      }
    }
  }

  const overview: CurrencyOverview[] = [];

  for (const [currency, people] of byCurrency) {
    // Chi è in credito in un gruppo e in debito in un altro per lo stesso
    // importo sparisce qui: il saldo complessivo con quella persona è zero.
    const visible = [...people.values()].filter((person) => person.netCents !== 0);
    if (visible.length === 0) continue;

    visible.sort(
      (a, b) =>
        Math.abs(b.netCents) - Math.abs(a.netCents) ||
        a.name.localeCompare(b.name, "it") ||
        a.key.localeCompare(b.key),
    );

    const toReceiveCents = visible
      .filter((person) => person.netCents > 0)
      .reduce((sum, person) => sum + person.netCents, 0);
    const toPayCents = visible
      .filter((person) => person.netCents < 0)
      .reduce((sum, person) => sum - person.netCents, 0);

    const groupIds = new Set(visible.flatMap((person) => person.groups.map((g) => g.id)));

    overview.push({
      currency,
      netCents: toReceiveCents - toPayCents,
      toReceiveCents,
      toPayCents,
      groupCount: groupIds.size,
      people: visible,
    });
  }

  return overview;
}
