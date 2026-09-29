import type { CategoryBreakdown } from "@/lib/category-totals";
import { categoryLabel } from "@/lib/categories";
import { formatCents } from "@/lib/money";
import type { Period } from "@/lib/periods";
import { NavLink } from "@/components/NavLink";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EmptyState, SegmentedLinks } from "@/components/ui";

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d={direction === "previous" ? "M15 5l-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

/**
 * Il periodo mostrato, fra le due frecce che lo spostano. Oltre il periodo in
 * corso la freccia si spegne: il futuro non ha spese da sommare.
 */
function PeriodNavigator({ period, hrefFor }: { period: Period; hrefFor: (key: string) => string }) {
  const unit = period.kind === "month" ? "Mese" : "Anno";
  // 44 px di lato: il bersaglio minimo per un dito, come i pulsanti.
  const arrow = "flex size-11 items-center justify-center rounded-full";

  return (
    <div className="mx-auto flex items-center sm:mx-0">
      <NavLink
        href={hrefFor(period.previous)}
        scroll={false}
        aria-label={`${unit} precedente`}
        className={`${arrow} text-tint hover:bg-fill`}
      >
        <Arrow direction="previous" />
      </NavLink>
      <span className="min-w-28 text-center text-[15px] font-semibold first-letter:uppercase">
        {period.label}
      </span>
      {period.next ? (
        <NavLink
          href={hrefFor(period.next)}
          scroll={false}
          aria-label={`${unit} successivo`}
          className={`${arrow} text-tint hover:bg-fill`}
        >
          <Arrow direction="next" />
        </NavLink>
      ) : (
        <span aria-hidden className={`${arrow} text-label-tertiary`}>
          <Arrow direction="next" />
        </span>
      )}
    </div>
  );
}

/**
 * Quanto ha speso il gruppo per categoria in un mese o in un anno. Una riga per
 * categoria, dalla più alta, con una barra lunga in proporzione.
 *
 * Le barre sono di un solo colore neutro: sono una serie sola, e a dire di che
 * categoria si tratta bastano icona e nome. Colorarle per categoria ripeterebbe
 * l'informazione, e le tinte che si ripetono fra categorie confonderebbero.
 * Sono decorative: i numeri sono testo.
 */
export function CategoryTotals({
  groupId,
  currency,
  period,
  breakdown,
}: {
  groupId: string;
  currency: string;
  period: Period;
  breakdown: CategoryBreakdown;
}) {
  const hrefFor = (key: string) => `/gruppi/${groupId}?periodo=${key}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-separator px-4 pt-3 pb-1 sm:py-2">
        {/* Su un telefono il controllo prende tutta la riga e le frecce vanno
            sotto, al centro; da tablet in su stanno affiancati. */}
        <SegmentedLinks
          className="w-full sm:w-44"
          scroll={false}
          items={[
            { href: hrefFor(period.asMonth), label: "Mese", active: period.kind === "month" },
            { href: hrefFor(period.asYear), label: "Anno", active: period.kind === "year" },
          ]}
        />
        <PeriodNavigator period={period} hrefFor={hrefFor} />
      </div>

      {breakdown.rows.length === 0 ? (
        <EmptyState>Nessuna spesa {period.inLabel}.</EmptyState>
      ) : (
        <>
          <p className="px-4 pt-3 text-[13px] text-label-secondary">
            In tutto{" "}
            <span className="font-semibold text-label tabular-nums">
              {formatCents(breakdown.totalCents, currency)}
            </span>
          </p>

          <ul className="divide-y divide-separator">
            {breakdown.rows.map((row) => (
              <li key={row.category ?? "senza"} className="flex items-center gap-3 px-4 py-3">
                <CategoryIcon category={row.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="truncate font-medium">{categoryLabel(row.category)}</span>
                    <span className="shrink-0 whitespace-nowrap tabular-nums">
                      <span className="font-semibold">{formatCents(row.amountCents, currency)}</span>
                      <span className="ml-2 inline-block w-9 text-right text-[13px] text-label-secondary">
                        {row.percent === 0 ? "<1%" : `${row.percent}%`}
                      </span>
                    </span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1.5 rounded-full">
                    <div
                      className="h-full min-w-1.5 rounded-full bg-label-secondary"
                      style={{ width: `${row.barRatio * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
