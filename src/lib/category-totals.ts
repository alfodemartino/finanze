import { allocateByWeights } from "@/lib/money";
import { CATEGORY_IDS, type ExpenseCategory } from "@/lib/categories";

/**
 * Quanto ha speso un gruppo per categoria in un periodo, pronto da mostrare.
 * La somma per categoria la fa il database; qui si decide l'ordine, le
 * percentuali e la lunghezza delle barre.
 */

export type CategoryTotal = { category: ExpenseCategory | null; amountCents: number };

export type CategoryBreakdownRow = CategoryTotal & {
  /** Percentuale intera sul totale del periodo: le righe sommano sempre a 100. */
  percent: number;
  /** Lunghezza della barra, da 0 a 1, rispetto alla categoria più alta. */
  barRatio: number;
};

export type CategoryBreakdown = { totalCents: number; rows: CategoryBreakdownRow[] };

const order = (category: ExpenseCategory | null) =>
  category === null ? CATEGORY_IDS.length : CATEGORY_IDS.indexOf(category);

/**
 * Le categorie con spese nel periodo, dalla più alta; «Senza categoria» sempre
 * in fondo, perché non è una categoria che compete con le altre ma quello che
 * manca da assegnare. A pari importo conta l'ordine dell'elenco, così la lista
 * non cambia da un caricamento all'altro.
 *
 * Le percentuali passano da `allocateByWeights`, lo stesso metodo dei resti
 * più grandi delle quote: arrotondate una per una potrebbero sommare a 99 o
 * 101, e chi le legge se ne accorge.
 */
export function categoryBreakdown(totals: CategoryTotal[]): CategoryBreakdown {
  const rows = totals
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => {
      if ((a.category === null) !== (b.category === null)) return a.category === null ? 1 : -1;
      return b.amountCents - a.amountCents || order(a.category) - order(b.category);
    });

  const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);
  if (totalCents === 0) return { totalCents: 0, rows: [] };

  const percents = allocateByWeights(100, rows.map((row) => row.amountCents));
  const max = Math.max(...rows.map((row) => row.amountCents));

  return {
    totalCents,
    rows: rows.map((row, index) => ({
      ...row,
      percent: percents[index],
      barRatio: row.amountCents / max,
    })),
  };
}
