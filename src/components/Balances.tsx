import type { Debt, MemberBalance } from "@/lib/balances";
import { formatCents } from "@/lib/money";
import { EmptyState, Money } from "@/components/ui";

export function BalanceTable({
  balances,
  currency,
}: {
  balances: MemberBalance[];
  currency: string;
}) {
  if (balances.length === 0) {
    return <EmptyState>Nessun membro nel gruppo.</EmptyState>;
  }

  return (
    // Container query, non media query: quello che conta è la larghezza della
    // card, non quella dello schermo. Nella pagina Saldi la card sta su due
    // colonne anche su desktop, e prima le quattro colonne finivano fuori dallo
    // scorrimento orizzontale portandosi via proprio il saldo.
    <div className="@container">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-2 pr-3 font-medium">Membro</th>
            <th className="hidden py-2 pr-3 text-right font-medium @lg:table-cell">Anticipato</th>
            <th className="hidden py-2 pr-3 text-right font-medium @lg:table-cell">A carico</th>
            <th className="py-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {balances.map((balance) => (
            <tr key={balance.memberId}>
              <td className="py-2 pr-3 align-top font-medium">
                {balance.name}
                {/* Quando le colonne di dettaglio sono nascoste il dato non si
                    perde: torna qui sotto, in forma compatta. */}
                <span className="mt-0.5 block text-xs font-normal tabular-nums text-slate-500 @lg:hidden dark:text-slate-400">
                  anticipato {formatCents(balance.paidCents, currency)} · a carico{" "}
                  {formatCents(balance.owedCents, currency)}
                </span>
              </td>
              <td className="hidden py-2 pr-3 text-right align-top tabular-nums text-slate-600 @lg:table-cell dark:text-slate-300">
                {formatCents(balance.paidCents, currency)}
              </td>
              <td className="hidden py-2 pr-3 text-right align-top tabular-nums text-slate-600 @lg:table-cell dark:text-slate-300">
                {formatCents(balance.owedCents, currency)}
              </td>
              <td className="py-2 text-right align-top whitespace-nowrap">
                <Money cents={balance.netCents} formatted={formatCents(balance.netCents, currency)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DebtList({ debts, currency }: { debts: Debt[]; currency: string }) {
  if (debts.length === 0) {
    return <EmptyState>I conti sono in pari: nessuno deve niente a nessuno. 🎉</EmptyState>;
  }

  return (
    <ul className="space-y-2">
      {debts.map((debt) => (
        <li
          key={`${debt.fromMemberId}-${debt.toMemberId}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
        >
          <span>
            <span className="font-medium">{debt.fromName}</span>
            <span className="mx-2 text-slate-400">deve dare a</span>
            <span className="font-medium">{debt.toName}</span>
          </span>
          <span className="font-semibold tabular-nums">{formatCents(debt.amountCents, currency)}</span>
        </li>
      ))}
    </ul>
  );
}
