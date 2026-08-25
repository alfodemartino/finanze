/**
 * L'ordine in cui vanno svuotate le tabelle quando si elimina un gruppo.
 *
 * Sta qui, e non in `groups.ts`, perché è una regola che si legge nello schema
 * e si verifica con un test, senza passare dal database.
 */

/**
 * Le tabelle toccate dall'eliminazione di un gruppo, con le tabelle che
 * ognuna riferisce. È la copia in TypeScript dei vincoli dichiarati in
 * `prisma/schema.prisma`: serve a tenere onesto `GROUP_CASCADE_ORDER`.
 */
export const GROUP_TABLE_REFERENCES = {
  expenseSplit: ["expense", "member"],
  expense: ["group", "member"],
  settlement: ["group", "member"],
  member: ["group"],
  group: [],
} as const satisfies Record<string, readonly string[]>;

export type GroupTable = keyof typeof GROUP_TABLE_REFERENCES;

/**
 * Prima chi riferisce, poi chi è riferito.
 *
 * Non basta cancellare la riga di `Group` e lasciar fare alla cascata del
 * database. I vincoli verso `Member` sono `RESTRICT` — è così che un membro
 * con spese alle spalle non si può cancellare — quindi Postgres, cancellando
 * il gruppo, proverebbe a rimuovere i membri mentre spese e rimborsi li
 * riferiscono ancora, e si fermerebbe con un errore. Quei vincoli restano come
 * sono, perché sono la rete di sicurezza del resto dell'app: è qui che va
 * rispettato l'ordine.
 */
export const GROUP_CASCADE_ORDER = [
  "expenseSplit",
  "expense",
  "settlement",
  "member",
  "group",
] as const satisfies readonly GroupTable[];
