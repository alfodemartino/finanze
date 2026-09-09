import type { CurrencyOverview } from "@/lib/overview";
import { formatCents } from "@/lib/money";
import { EmptyState, Money } from "@/components/ui";

/**
 * Il numero grande del riepilogo: quanto l'utente deve dare o ricevere in
 * tutto. Sotto, in piccolo, i due lati che lo compongono — perché «zero» detto
 * da solo non distingue chi non ha conti aperti da chi ne ha due che si
 * annullano.
 */
export function OverviewTotals({ overview }: { overview: CurrencyOverview }) {
  const { currency, netCents, toReceiveCents, toPayCents, groupCount } = overview;

  return (
    <div className="px-4 py-5">
      <p className="text-[13px] text-label-secondary">
        {netCents > 0 ? "In tutto ti devono" : netCents < 0 ? "In tutto devi dare" : "In tutto"}
      </p>
      <p className="mt-1 text-[34px] leading-none font-bold tracking-[-0.02em]">
        <Money cents={netCents} formatted={formatCents(Math.abs(netCents), currency)} />
      </p>
      <p className="mt-2.5 text-[13px] text-label-secondary">
        <span className="tabular-nums">
          Ti devono {formatCents(toReceiveCents, currency)}
        </span>
        <span className="mx-1.5">·</span>
        <span className="tabular-nums">Devi dare {formatCents(toPayCents, currency)}</span>
        <span className="mx-1.5">·</span>
        <span>
          {groupCount} {groupCount === 1 ? "gruppo" : "gruppi"}
        </span>
      </p>
    </div>
  );
}

/**
 * Il saldo verso ogni persona, sommato su tutti i gruppi in comune. Sotto al
 * nome i gruppi da cui viene il saldo: senza, una riga che mette insieme due
 * gruppi non si saprebbe da dove arriva.
 */
export function PersonBalanceList({ overview }: { overview: CurrencyOverview }) {
  if (overview.people.length === 0) {
    return <EmptyState>Nessun conto aperto con i membri dei tuoi gruppi.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-separator">
      {overview.people.map((person) => (
        <li
          key={person.key}
          className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]"
        >
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-medium">{person.name}</span>
            <span className="mt-0.5 block truncate text-[13px] text-label-secondary">
              {person.netCents > 0 ? "ti deve dare" : "devi dare"} ·{" "}
              {person.groups.map((group) => group.name).join(" · ")}
            </span>
          </span>
          <span className="whitespace-nowrap">
            <Money
              cents={person.netCents}
              formatted={formatCents(Math.abs(person.netCents), overview.currency)}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Quello che si vede quando non c'è nessun conto aperto, in nessuna valuta. */
export function OverviewSettled() {
  return (
    <EmptyState>I conti sono in pari: non devi niente a nessuno e nessuno deve niente a te. 🎉</EmptyState>
  );
}
