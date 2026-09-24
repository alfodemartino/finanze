import { centsToInput, formatCents } from "@/lib/money";

/**
 * Ricerca testuale negli elenchi: si decide sul server che cosa di una voce è
 * cercabile, e nel browser si confronta quel testo con quello che si digita.
 *
 * Il confronto ignora maiuscole e accenti — «caffe» trova «Caffè» — e divide
 * la ricerca in parole: una voce corrisponde se le contiene tutte, in qualsiasi
 * ordine. Così «luce agosto» trova «Bolletta luce di agosto».
 */

/** Minuscolo e senza accenti: la forma in cui due testi si confrontano. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Il testo in cui cercare, fatto dei pezzi di una voce: quelli vuoti si saltano. */
export function buildSearchText(parts: (string | null | undefined)[]): string {
  return normalizeForSearch(parts.filter(Boolean).join(" "));
}

/** Le parole di una ricerca, già normalizzate: nessuna parola se è vuota. */
export function searchTerms(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

/** Vero se il testo, prodotto da `buildSearchText`, contiene tutte le parole. */
export function matchesSearch(searchText: string, terms: string[]): boolean {
  return terms.every((term) => searchText.includes(term));
}

/** Quello che di una spesa serve alla ricerca. */
export type SearchableExpense = {
  description: string;
  amountCents: number;
  date: Date;
  note: string | null;
  payer: { name: string };
};

/**
 * Il testo in cui si cerca una spesa: quello che la sua riga mostra, tranne i
 * partecipanti. Cercando un nome si trovano così le spese pagate da quella
 * persona, non tutte quelle a cui partecipa, che sarebbero quasi tutte.
 *
 * Importo e data compaiono in più forme, perché si cercano come si scrivono:
 * «12.345,60 €» si trova anche con «12345,6» o «12345.6», e «24 set 2026» anche
 * con «settembre». Le date si formattano come nell'elenco, sul server.
 */
export function expenseSearchText(expense: SearchableExpense, currency: string): string {
  const plainAmount = centsToInput(expense.amountCents);
  return buildSearchText([
    expense.description,
    formatCents(expense.amountCents, currency),
    plainAmount,
    plainAmount.replace(".", ","),
    new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(expense.date),
    new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(expense.date),
    expense.payer.name,
    expense.note,
  ]);
}
