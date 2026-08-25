import { describe, expect, it } from "vitest";
import {
  buildExportRows,
  buildSummaryRows,
  exportFileName,
  type ExportExpense,
  type ExportSettlement,
} from "@/lib/export";

const spesa = (
  date: string,
  description: string,
  amountCents: number,
  note: string | null = null,
  fra = ["Anna", "Bruno"],
): ExportExpense => ({
  date: new Date(date),
  description,
  amountCents,
  note,
  payer: { name: "Anna" },
  splits: fra.map((name) => ({ member: { name } })),
});

const rimborso = (date: string, amountCents: number, note: string | null = null): ExportSettlement => ({
  date: new Date(date),
  amountCents,
  note,
  from: { name: "Bruno" },
  to: { name: "Anna" },
});

describe("buildExportRows", () => {
  it("mette spese e rimborsi in un'unica lista in ordine di data", () => {
    const rows = buildExportRows({
      expenses: [spesa("2026-03-10", "Spesa al mercato", 4500), spesa("2026-01-05", "Bolletta luce", 8900)],
      settlements: [rimborso("2026-02-01", 2000)],
    });

    expect(rows.map((row) => row.date.toISOString().slice(0, 10))).toEqual([
      "2026-01-05",
      "2026-02-01",
      "2026-03-10",
    ]);
    expect(rows.map((row) => row.type)).toEqual(["Spesa", "Rimborso", "Spesa"]);
  });

  it("a parità di data mette prima la spesa e poi il rimborso", () => {
    const rows = buildExportRows({
      expenses: [spesa("2026-05-01", "Cena", 6000)],
      settlements: [rimborso("2026-05-01", 3000)],
    });

    expect(rows.map((row) => row.type)).toEqual(["Spesa", "Rimborso"]);
  });

  it("dice chi ha pagato e per chi", () => {
    const rows = buildExportRows({
      expenses: [spesa("2026-05-01", "Cena", 6000, null, ["Anna", "Bruno", "Carla"])],
      settlements: [],
    });

    expect(rows[0].description).toBe("Cena");
    expect(rows[0].paidBy).toBe("Anna");
    expect(rows[0].paidTo).toBe("Anna, Bruno, Carla");
  });

  it("di un rimborso dice chi ha pagato e a chi", () => {
    const rows = buildExportRows({ expenses: [], settlements: [rimborso("2026-05-02", 3000)] });

    expect(rows[0].paidBy).toBe("Bruno");
    expect(rows[0].paidTo).toBe("Anna");
    // Le due colonne dicono già tutto: la descrizione resta vuota.
    expect(rows[0].description).toBe("");
  });

  it("su una spesa non divisa con nessuno lascia vuota la colonna", () => {
    const rows = buildExportRows({ expenses: [spesa("2026-05-01", "Cena", 6000, null, [])], settlements: [] });

    expect(rows[0].paidTo).toBe("");
  });

  it("lascia la nota vuota quando non c'è", () => {
    const rows = buildExportRows({
      expenses: [spesa("2026-05-01", "Cena", 6000, "con i vicini")],
      settlements: [rimborso("2026-05-02", 3000)],
    });

    expect(rows[0].note).toBe("con i vicini");
    expect(rows[1].note).toBe("");
  });

  it("riporta gli importi in centesimi, come sono salvati", () => {
    const rows = buildExportRows({ expenses: [spesa("2026-05-01", "Cena", 6050)], settlements: [] });
    expect(rows[0].amountCents).toBe(6050);
  });

  it("non si rompe con un gruppo senza operazioni", () => {
    expect(buildExportRows({ expenses: [], settlements: [] })).toEqual([]);
  });
});

describe("exportFileName", () => {
  it("compone nome del gruppo e data", () => {
    expect(exportFileName("Casa Rossi", new Date("2026-08-25T10:00:00Z"))).toBe(
      "Finanze - Casa Rossi - 2026-08-25.xlsx",
    );
  });

  it("toglie i caratteri che i sistemi operativi non accettano", () => {
    expect(exportFileName('Casa/Rossi "2026"', new Date("2026-08-25T10:00:00Z"))).toBe(
      "Finanze - Casa Rossi 2026 - 2026-08-25.xlsx",
    );
  });
});

describe("buildSummaryRows", () => {
  const balances = [
    { name: "Anna", paidCents: 8450, owedCents: 12017, netCents: -4567 },
    { name: "Bruno", paidCents: 12000, owedCents: 9617, netCents: 2383 },
    { name: "Carla", paidCents: 6000, owedCents: 4816, netCents: 2184 },
  ];
  const debts = [
    { fromName: "Anna", toName: "Bruno", amountCents: 2383 },
    { fromName: "Anna", toName: "Carla", amountCents: 2184 },
  ];

  /** Il testo della prima cella di ogni riga, per leggere lo specchietto. */
  const etichette = (rows: ReturnType<typeof buildSummaryRows>) =>
    rows.map((row) => (typeof row[0]?.value === "string" ? row[0].value : ""));

  const riepilogo = buildSummaryRows({
    balances,
    debts,
    totalExpensesCents: 26450,
    totalSettlementsCents: 1000,
  });

  it("apre con le tre sezioni chieste", () => {
    expect(etichette(riepilogo)).toEqual(
      expect.arrayContaining([
        "RIEPILOGO",
        "TOTALE SPESO PER PERSONA",
        "SOMMA TOTALE",
        "PAGAMENTI DA EFFETTUARE",
      ]),
    );
  });

  it("dà a ogni persona anticipato, a carico e saldo", () => {
    const anna = riepilogo.find((row) => row[0]?.value === "Anna");

    expect(anna?.map((cell) => cell.value)).toEqual(["Anna", 8450, 12017, -4567]);
    // Gli importi restano centesimi interi: la conversione la fa il foglio.
    expect(anna?.slice(1).every((cell) => cell.format === "currency")).toBe(true);
  });

  it("tiene separati il totale delle spese e quello dei rimborsi", () => {
    const spese = riepilogo.find((row) => row[0]?.value === "Totale delle spese");
    const rimborsi = riepilogo.find((row) => row[0]?.value === "Totale dei rimborsi");

    expect(spese?.[1]?.value).toBe(26450);
    expect(rimborsi?.[1]?.value).toBe(1000);
  });

  it("elenca tutti i pagamenti da effettuare", () => {
    const pagamenti = riepilogo.filter((row) => row[0]?.value === "Anna" && row.length === 3);

    expect(pagamenti.map((row) => row.map((cell) => cell.value))).toEqual([
      ["Anna", "Bruno", 2383],
      ["Anna", "Carla", 2184],
    ]);
  });

  it("quando i conti sono in pari lo dice invece di lasciare il vuoto", () => {
    const pari = buildSummaryRows({
      balances,
      debts: [],
      totalExpensesCents: 0,
      totalSettlementsCents: 0,
    });

    expect(etichette(pari)).toContain("I conti sono in pari: nessun pagamento.");
    expect(etichette(pari)).not.toContain("DA");
  });

  it("regge un gruppo senza membri e senza operazioni", () => {
    const vuoto = buildSummaryRows({
      balances: [],
      debts: [],
      totalExpensesCents: 0,
      totalSettlementsCents: 0,
    });

    expect(etichette(vuoto)).toContain("TOTALE SPESO PER PERSONA");
  });
});
