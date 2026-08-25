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
      <table className="w-full text-[15px]">
        <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
          <tr>
            <th className="py-2 pr-3 font-semibold">Membro</th>
            <th className="hidden py-2 pr-3 text-right font-semibold @lg:table-cell">Anticipato</th>
            <th className="hidden py-2 pr-3 text-right font-semibold @lg:table-cell">A carico</th>
            <th className="py-2 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-separator">
          {balances.map((balance) => (
            <tr key={balance.memberId}>
              <td className="py-2.5 pr-3 align-top font-medium">
                {balance.name}
                {/* Quando le colonne di dettaglio sono nascoste il dato non si
                    perde: torna qui sotto, in forma compatta. */}
                <span className="mt-0.5 block text-[12px] font-normal tabular-nums text-label-secondary @lg:hidden">
                  anticipato {formatCents(balance.paidCents, currency)} · a carico{" "}
                  {formatCents(balance.owedCents, currency)}
                </span>
              </td>
              <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums text-label-secondary @lg:table-cell">
                {formatCents(balance.paidCents, currency)}
              </td>
              <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums text-label-secondary @lg:table-cell">
                {formatCents(balance.owedCents, currency)}
              </td>
              <td className="py-2.5 text-right align-top whitespace-nowrap">
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
    <ul className="divide-y divide-separator">
      {debts.map((debt) => (
        <li
          key={`${debt.fromMemberId}-${debt.toMemberId}`}
          className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[15px] first:pt-0 last:pb-0"
        >
          <span>
            <span className="font-medium">{debt.fromName}</span>
            <span className="mx-2 text-label-secondary">deve dare a</span>
            <span className="font-medium">{debt.toName}</span>
          </span>
          <span className="font-semibold tabular-nums">{formatCents(debt.amountCents, currency)}</span>
        </li>
      ))}
    </ul>
  );
}
