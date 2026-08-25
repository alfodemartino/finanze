import { describe, expect, it } from "vitest";
import { buildExportRows, exportFileName, type ExportExpense, type ExportSettlement } from "@/lib/export";

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
