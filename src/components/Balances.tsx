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
    <div className="scroll-x">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-2 pr-3 font-medium">Membro</th>
            <th className="py-2 pr-3 text-right font-medium">Anticipato</th>
            <th className="py-2 pr-3 text-right font-medium">A carico</th>
            <th className="py-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {balances.map((balance) => (
            <tr key={balance.memberId}>
              <td className="py-2 pr-3 font-medium">{balance.name}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCents(balance.paidCents, currency)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCents(balance.owedCents, currency)}
              </td>
              <td className="py-2 text-right">
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
