/**
 * Export di un gruppo in formato xlsx.
 *
 * Nel foglio finiscono tutte le operazioni del gruppo — le spese e i rimborsi
 * — su un'unica lista in ordine di data, così il file si legge come un
 * estratto conto. La logica qui è pura: costruisce le righe a partire dai
 * dati, senza toccare il database.
 */

import {
  buildXlsx,
  sanitizeSheetName,
  type XlsxCell,
  type XlsxColumn,
  type XlsxValue,
} from "@/lib/xlsx";

export const EXPORT_COLUMNS: XlsxColumn[] = [
  { header: "DATA", width: 12, format: "date" },
  { header: "TIPO OPERAZIONE", width: 18 },
  { header: "DESCRIZIONE OPERAZIONE", width: 36 },
  { header: "PAGATO DA", width: 18 },
  { header: "PAGATO A", width: 32 },
  { header: "NOTE", width: 28 },
  { header: "IMPORTO", width: 14, format: "currency" },
];

export type ExportExpense = {
  date: Date;
  description: string;
  amountCents: number;
  note: string | null;
  payer: { name: string };
  /** I membri fra cui la spesa è divisa: sono loro a beneficiarne. */
  splits: { member: { name: string } }[];
};

export type ExportSettlement = {
  date: Date;
  amountCents: number;
  note: string | null;
  from: { name: string };
  to: { name: string };
};

/** Il saldo di un membro, come lo calcola `computeBalances`. */
export type ExportBalance = {
  name: string;
  paidCents: number;
  owedCents: number;
  /** Positivo: deve ricevere. Negativo: deve dare. */
  netCents: number;
};

/** Un pagamento suggerito, come lo calcola `simplifyDebts`. */
export type ExportDebt = {
  fromName: string;
  toName: string;
  amountCents: number;
};

export type ExportRow = {
  date: Date;
  type: "Spesa" | "Rimborso";
  description: string;
  paidBy: string;
  paidTo: string;
  note: string;
  amountCents: number;
};

/**
 * Unisce spese e rimborsi in una sola lista ordinata per data.
 *
 * A parità di data vengono prima le spese, poi i rimborsi: chi legge il file
 * vede la spesa sostenuta e subito sotto il rimborso che la chiude.
 */
export function buildExportRows({
  expenses,
  settlements,
}: {
  expenses: ExportExpense[];
  settlements: ExportSettlement[];
}): ExportRow[] {
  const rows: ExportRow[] = [
    ...expenses.map((expense): ExportRow => ({
      date: expense.date,
      type: "Spesa",
      description: expense.description,
      paidBy: expense.payer.name,
      // Una spesa si paga a un negozio, non a un membro: qui vanno le persone
      // per cui è stata anticipata, cioè quelle fra cui è divisa.
      paidTo: expense.splits.map((split) => split.member.name).join(", "),
      note: expense.note ?? "",
      amountCents: expense.amountCents,
    })),
    ...settlements.map((settlement): ExportRow => ({
      date: settlement.date,
      type: "Rimborso",
      // Un rimborso non ha una descrizione sua nel database, e ripetere qui
      // i due nomi vorrebbe dire copiare le due colonne che seguono.
      description: "",
      paidBy: settlement.from.name,
      paidTo: settlement.to.name,
      note: settlement.note ?? "",
      amountCents: settlement.amountCents,
    })),
  ];

  return rows.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || Number(a.type === "Rimborso") - Number(b.type === "Rimborso"),
  );
}

/**
 * Lo specchietto sta a destra della tabella: questa è la sua prima colonna.
 * La tabella arriva alla G, la H resta vuota e fa da margine.
 */
export const SUMMARY_START_COLUMN = 8;

/** Larghezza delle quattro colonne dello specchietto. */
export const SUMMARY_WIDTHS = [26, 15, 15, 15];

/**
 * Lo specchietto di riepilogo, riga per riga: quanto ha speso ognuno, i
 * totali del gruppo e i pagamenti che restano da fare.
 *
 * Le righe vuote separano una sezione dall'altra.
 */
export function buildSummaryRows({
  balances,
  debts,
  totalExpensesCents,
  totalSettlementsCents,
}: {
  balances: ExportBalance[];
  debts: ExportDebt[];
  totalExpensesCents: number;
  totalSettlementsCents: number;
}): XlsxCell[][] {
  const text = (value: string): XlsxCell => ({ value });
  const title = (value: string): XlsxCell => ({ value, bold: true });
  const money = (cents: number, strong = false): XlsxCell => ({
    value: cents,
    format: "currency",
    bold: strong,
  });

  const rows: XlsxCell[][] = [[title("RIEPILOGO")], []];

  rows.push([title("TOTALE SPESO PER PERSONA")]);
  rows.push([title("PERSONA"), title("ANTICIPATO"), title("A CARICO"), title("SALDO")]);
  for (const balance of balances) {
    rows.push([
      text(balance.name),
      money(balance.paidCents),
      money(balance.owedCents),
      money(balance.netCents),
    ]);
  }
  // Il segno del saldo non è ovvio a chi apre il file senza aver visto l'app.
  rows.push([text("Saldo positivo: deve ricevere. Negativo: deve dare.")]);

  rows.push([]);
  rows.push([title("SOMMA TOTALE")]);
  rows.push([text("Totale delle spese"), money(totalExpensesCents, true)]);
  // I rimborsi non sono spesa: sono soldi che si spostano dentro al gruppo,
  // e sommarli alle spese conterebbe due volte le stesse uscite.
  rows.push([text("Totale dei rimborsi"), money(totalSettlementsCents, true)]);

  rows.push([]);
  rows.push([title("PAGAMENTI DA EFFETTUARE")]);
  if (debts.length === 0) {
    rows.push([text("I conti sono in pari: nessun pagamento.")]);
  } else {
    rows.push([title("DA"), title("A"), title("IMPORTO")]);
    for (const debt of debts) {
      rows.push([text(debt.fromName), text(debt.toName), money(debt.amountCents)]);
    }
  }

  return rows;
}

/** Le righe nell'ordine delle colonne del foglio. */
function toCells(row: ExportRow): XlsxValue[] {
  return [row.date, row.type, row.description, row.paidBy, row.paidTo, row.note, row.amountCents];
}

/**
 * Il file xlsx del gruppo: un foglio solo, intitolato al gruppo stesso, con
 * la lista delle operazioni e lo specchietto di riepilogo di fianco.
 */
export function buildGroupExport({
  groupName,
  currency,
  expenses,
  settlements,
  balances,
  debts,
}: {
  groupName: string;
  currency: string;
  expenses: ExportExpense[];
  settlements: ExportSettlement[];
  balances: ExportBalance[];
  debts: ExportDebt[];
}): Buffer {
  const total = (amounts: { amountCents: number }[]) =>
    amounts.reduce((sum, item) => sum + item.amountCents, 0);

  return buildXlsx({
    sheetName: groupName,
    currency,
    columns: EXPORT_COLUMNS,
    rows: buildExportRows({ expenses, settlements }).map(toCells),
    side: {
      startColumn: SUMMARY_START_COLUMN,
      widths: SUMMARY_WIDTHS,
      rows: buildSummaryRows({
        balances,
        debts,
        totalExpensesCents: total(expenses),
        totalSettlementsCents: total(settlements),
      }),
    },
  });
}

/**
 * Nome del file scaricato, es. "Finanze - Casa Rossi - 2026-08-25.xlsx".
 * Toglie i caratteri che i vari sistemi operativi non accettano nei nomi.
 */
export function exportFileName(groupName: string, today = new Date()): string {
  const name = sanitizeSheetName(groupName, "gruppo").replace(/["<>|]/g, "");
  const day = today.toISOString().slice(0, 10);
  return `Finanze - ${name} - ${day}.xlsx`;
}
