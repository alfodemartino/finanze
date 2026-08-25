/**
 * Export di un gruppo in formato xlsx.
 *
 * Nel foglio finiscono tutte le operazioni del gruppo — le spese e i rimborsi
 * — su un'unica lista in ordine di data, così il file si legge come un
 * estratto conto. La logica qui è pura: costruisce le righe a partire dai
 * dati, senza toccare il database.
 */

import { buildXlsx, sanitizeSheetName, type XlsxColumn, type XlsxValue } from "@/lib/xlsx";

export const EXPORT_COLUMNS: XlsxColumn[] = [
  { header: "DATA", width: 12, format: "date" },
  { header: "TIPO OPERAZIONE", width: 18 },
  { header: "DESCRIZIONE OPERAZIONE", width: 46 },
  { header: "NOTE", width: 32 },
  { header: "IMPORTO", width: 14, format: "currency" },
];

export type ExportExpense = {
  date: Date;
  description: string;
  amountCents: number;
  note: string | null;
  payer: { name: string };
};

export type ExportSettlement = {
  date: Date;
  amountCents: number;
  note: string | null;
  from: { name: string };
  to: { name: string };
};

export type ExportRow = {
  date: Date;
  type: "Spesa" | "Rimborso";
  description: string;
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
      // Chi ha pagato non ha una colonna sua, ma è il dato che rende
      // leggibile la riga: sta nella descrizione.
      description: `${expense.description} (ha pagato ${expense.payer.name})`,
      note: expense.note ?? "",
      amountCents: expense.amountCents,
    })),
    ...settlements.map((settlement): ExportRow => ({
      date: settlement.date,
      type: "Rimborso",
      description: `${settlement.from.name} → ${settlement.to.name}`,
      note: settlement.note ?? "",
      amountCents: settlement.amountCents,
    })),
  ];

  return rows.sort(
    (a, b) => a.date.getTime() - b.date.getTime() || Number(a.type === "Rimborso") - Number(b.type === "Rimborso"),
  );
}

/** Le righe nell'ordine delle colonne del foglio. */
function toCells(row: ExportRow): XlsxValue[] {
  return [row.date, row.type, row.description, row.note, row.amountCents];
}

/** Il file xlsx del gruppo: un foglio solo, intitolato al gruppo stesso. */
export function buildGroupExport({
  groupName,
  currency,
  expenses,
  settlements,
}: {
  groupName: string;
  currency: string;
  expenses: ExportExpense[];
  settlements: ExportSettlement[];
}): Buffer {
  return buildXlsx({
    sheetName: groupName,
    currency,
    columns: EXPORT_COLUMNS,
    rows: buildExportRows({ expenses, settlements }).map(toCells),
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
