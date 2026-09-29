import { describe, expect, it } from "vitest";
import { categoryBreakdown } from "@/lib/category-totals";

describe("categoryBreakdown", () => {
  it("ordina dalla categoria più alta e tiene «senza categoria» in fondo", () => {
    const { rows } = categoryBreakdown([
      { category: "UTILITIES", amountCents: 32000 },
      { category: null, amountCents: 90000 },
      { category: "GROCERIES", amountCents: 51230 },
    ]);
    expect(rows.map((row) => row.category)).toEqual(["GROCERIES", "UTILITIES", null]);
  });

  it("a pari importo segue l'ordine dell'elenco delle categorie", () => {
    const { rows } = categoryBreakdown([
      { category: "TAXES", amountCents: 1000 },
      { category: "HOME", amountCents: 1000 },
    ]);
    expect(rows.map((row) => row.category)).toEqual(["HOME", "TAXES"]);
  });

  it("dà il totale e percentuali che sommano sempre a 100", () => {
    const { totalCents, rows } = categoryBreakdown([
      { category: "GROCERIES", amountCents: 100 },
      { category: "HOME", amountCents: 100 },
      { category: "TRAVEL", amountCents: 100 },
    ]);
    expect(totalCents).toBe(300);
    expect(rows.map((row) => row.percent)).toEqual([34, 33, 33]);
  });

  it("misura le barre sulla categoria più alta, anche se è «senza categoria»", () => {
    const { rows } = categoryBreakdown([
      { category: "GROCERIES", amountCents: 2500 },
      { category: null, amountCents: 10000 },
    ]);
    expect(rows.map((row) => row.barRatio)).toEqual([0.25, 1]);
  });

  it("salta le categorie senza spese e regge un periodo vuoto", () => {
    expect(categoryBreakdown([{ category: "HOME", amountCents: 0 }])).toEqual({
      totalCents: 0,
      rows: [],
    });
    expect(categoryBreakdown([])).toEqual({ totalCents: 0, rows: [] });
  });
});
