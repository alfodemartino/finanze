import type { Debt, MemberBalance } from "@/lib/balances";
import { formatCents } from "@/lib/money";
import { ArrowRight } from "lucide-react";
import { Avatar, EmptyState, Money } from "@/components/ui";

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

/**
 * Il saldo di chi guarda, in grande: è la prima cosa che si vuole sapere
 * entrando nel gruppo, e prima andava ricavata leggendo le righe dei debiti.
 * Sotto, i due numeri da cui nasce, perché «in pari» detto da solo non
 * distingue chi non ha speso niente da chi ha anticipato quanto gli spettava.
 */
export function ViewerBalance({
  balance,
  currency,
}: {
  balance: MemberBalance | undefined;
  currency: string;
}) {
  const netCents = balance?.netCents ?? 0;

  return (
    <div>
      <p className="text-[13px] text-label-secondary">
        {netCents > 0 ? "Ti devono" : netCents < 0 ? "Devi dare" : "Sei in pari"}
      </p>
      <p className="mt-1 text-[40px] leading-none font-bold tracking-[-0.02em]">
        <Money cents={netCents} formatted={formatCents(Math.abs(netCents), currency)} />
      </p>
      {balance && (
        <p className="mt-2.5 text-[13px] text-label-secondary tabular-nums">
          Hai anticipato {formatCents(balance.paidCents, currency)} · a tuo carico{" "}
          {formatCents(balance.owedCents, currency)}
        </p>
      )}
    </div>
  );
}

/**
 * La frase di un pagamento suggerito. Quando riguarda chi guarda si parla a
 * lui — «Devi dare a Bruno», «Carla ti deve dare» — perché sono le righe che
 * gli chiedono di fare qualcosa.
 */
function debtSentence(debt: Debt, viewerId: string | undefined) {
  if (debt.fromMemberId === viewerId) {
    return (
      <>
        <span className="text-label-secondary">Devi dare a</span>{" "}
        <span className="font-medium">{debt.toName}</span>
      </>
    );
  }
  if (debt.toMemberId === viewerId) {
    return (
      <>
        <span className="font-medium">{debt.fromName}</span>{" "}
        <span className="text-label-secondary">ti deve dare</span>
      </>
    );
  }
  return (
    <>
      <span className="font-medium">{debt.fromName}</span>{" "}
      <span className="text-label-secondary">deve dare a</span>{" "}
      <span className="font-medium">{debt.toName}</span>
    </>
  );
}

export function DebtList({
  debts,
  currency,
  viewerId,
}: {
  debts: Debt[];
  currency: string;
  /** Il membro di chi guarda: le sue righe gli si rivolgono direttamente. */
  viewerId?: string;
}) {
  if (debts.length === 0) {
    return <EmptyState>I conti sono in pari: nessuno deve niente a nessuno. 🎉</EmptyState>;
  }

  return (
    <ul className="divide-y divide-separator">
      {debts.map((debt) => (
        <li
          key={`${debt.fromMemberId}-${debt.toMemberId}`}
          className="flex items-center gap-3 py-2.5 text-[15px] first:pt-0 last:pb-0"
        >
          {/* Chi dà e chi riceve, con la freccia in mezzo: si legge prima
              della frase, che resta il dato per chi usa un lettore di schermo. */}
          <span aria-hidden className="flex shrink-0 items-center gap-1">
            <Avatar name={debt.fromName} />
            <ArrowRight strokeWidth={2.5} className="size-3.5 text-label-tertiary" />
            <Avatar name={debt.toName} />
          </span>
          <span className="min-w-0 flex-1">{debtSentence(debt, viewerId)}</span>
          <span className="font-semibold whitespace-nowrap tabular-nums">
            {formatCents(debt.amountCents, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
