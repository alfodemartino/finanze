import { describe, expect, it } from "vitest";
import {
  buildSearchText,
  expenseSearchText,
  matchesSearch,
  normalizeForSearch,
  searchTerms,
} from "@/lib/search";

function matches(parts: (string | null)[], query: string) {
  return matchesSearch(buildSearchText(parts), searchTerms(query));
}

describe("normalizeForSearch", () => {
  it("ignora maiuscole e accenti", () => {
    expect(normalizeForSearch("Caffè PERCHÉ Città")).toBe("caffe perche citta");
  });
});

describe("searchTerms", () => {
  it("divide la ricerca in parole e ignora gli spazi in più", () => {
    expect(searchTerms("  Luce   Agosto ")).toEqual(["luce", "agosto"]);
  });

  it("non ha parole se la ricerca è vuota", () => {
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("matchesSearch", () => {
  const expense = ["Bolletta luce di agosto", "Mario", "82,40 €", null];

  it("trova una parte di parola, senza badare a maiuscole e accenti", () => {
    expect(matches(expense, "BOLL")).toBe(true);
    expect(matches(["Caffè al bar"], "caffe")).toBe(true);
    expect(matches(["Caffe al bar"], "caffè")).toBe(true);
  });

  it("vuole tutte le parole, in qualsiasi ordine e anche in pezzi diversi", () => {
    expect(matches(expense, "agosto luce")).toBe(true);
    expect(matches(expense, "luce mario")).toBe(true);
    expect(matches(expense, "luce gas")).toBe(false);
  });

  it("confronta anche gli importi", () => {
    expect(matches(expense, "82,4")).toBe(true);
    expect(matches(expense, "90")).toBe(false);
  });

  it("con una ricerca vuota tiene tutto", () => {
    expect(matches(expense, "")).toBe(true);
  });

  it("salta i pezzi mancanti invece di scrivere «null»", () => {
    expect(matches(expense, "null")).toBe(false);
  });
});

describe("expenseSearchText", () => {
  const expense = {
    description: "Spesa al supermercato",
    amountCents: 1234560,
    date: new Date("2026-09-24T12:00:00Z"),
    note: "Anche i detersivi",
    category: "GROCERIES" as const,
    payer: { name: "Lucia" },
  };

  function finds(query: string) {
    return matchesSearch(expenseSearchText(expense, "EUR"), searchTerms(query));
  }

  it("trova descrizione, nota e chi ha pagato", () => {
    expect(finds("supermercato")).toBe(true);
    expect(finds("detersivi")).toBe(true);
    expect(finds("lucia")).toBe(true);
  });

  it("trova l'importo come si mostra e come si scrive", () => {
    expect(finds("12.345,60")).toBe(true);
    expect(finds("12345,6")).toBe(true);
    expect(finds("12345.6")).toBe(true);
  });

  it("trova la data, anche col mese per intero", () => {
    expect(finds("24 set 2026")).toBe(true);
    expect(finds("settembre")).toBe(true);
    expect(finds("ottobre")).toBe(false);
  });

  it("trova la categoria, ma non l'assenza di categoria", () => {
    expect(finds("alimentare")).toBe(true);
    const senza = { ...expense, category: null };
    expect(matchesSearch(expenseSearchText(senza, "EUR"), searchTerms("senza"))).toBe(false);
  });

  it("non cerca fra i partecipanti", () => {
    const withSplits = { ...expense, splits: [{ member: { name: "Giorgio" } }] };
    expect(matchesSearch(expenseSearchText(withSplits, "EUR"), searchTerms("giorgio"))).toBe(false);
  });
});
