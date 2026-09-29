import { describe, expect, it } from "vitest";
import { ExpenseCategory as PrismaExpenseCategory } from "@prisma/client";
import {
  buildCategoryHistory,
  CATEGORIES,
  CATEGORY_IDS,
  categoryLabel,
  historyKey,
  keywordCategory,
  normalizeDescription,
  planCategorization,
  suggestCategory,
  type ExpenseCategory,
} from "@/lib/categories";

describe("elenco delle categorie", () => {
  it("coincide con l'enum dello schema Prisma", () => {
    expect([...CATEGORY_IDS].sort()).toEqual(Object.values(PrismaExpenseCategory).sort());
  });

  it("non mette la stessa parola chiave in due categorie", () => {
    const owner = new Map<string, ExpenseCategory>();
    const duplicates: string[] = [];
    for (const id of CATEGORY_IDS) {
      const { keywords, generic = [] } = CATEGORIES[id];
      for (const keyword of [...keywords, ...generic]) {
        const key = normalizeDescription(keyword) + (keyword.endsWith("*") ? "*" : "");
        const previous = owner.get(key);
        if (previous && previous !== id) duplicates.push(`${keyword} (${previous}, ${id})`);
        owner.set(key, id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it("chiama «senza categoria» la spesa che non ne ha una", () => {
    expect(categoryLabel(null)).toBe("Senza categoria");
    expect(categoryLabel("UTILITIES")).toBe("Bollette");
  });
});

describe("keywordCategory", () => {
  it.each<[string, ExpenseCategory]>([
    ["Spesa Conad", "GROCERIES"],
    ["Esselunga", "GROCERIES"],
    ["Pizzeria da Michele", "RESTAURANTS"],
    ["Cena fuori", "RESTAURANTS"],
    ["Affitto settembre", "HOME"],
    ["Spese condominiali", "HOME"],
    ["Bolletta luce agosto", "UTILITIES"],
    ["Enel", "UTILITIES"],
    ["Benzina", "TRANSPORT"],
    ["Treno per Roma", "TRANSPORT"],
    ["Volo Ryanair", "TRAVEL"],
    ["B&B a Matera", "TRAVEL"],
    ["Farmacia", "HEALTH"],
    ["Visita dal dentista", "HEALTH"],
    ["Cinema", "LEISURE"],
    ["Padel con gli amici", "LEISURE"],
    ["Scarpe nuove", "CLOTHING"],
    ["H&M", "CLOTHING"],
    ["Mensa scolastica", "EDUCATION"],
    ["Veterinario", "PETS"],
    ["Regalo per la maestra", "GIFTS"],
    ["Assicurazione auto", "TAXES"],
  ])("«%s» → %s", (description, category) => {
    expect(keywordCategory(description)).toBe(category);
  });

  it("ignora maiuscole, accenti e punteggiatura", () => {
    expect(keywordCategory("CAFFÈ!")).toBe("RESTAURANTS");
    expect(keywordCategory("caffe")).toBe("RESTAURANTS");
    expect(keywordCategory("bolletta-gas")).toBe("UTILITIES");
  });

  it("cerca parole intere, non pezzi di parola", () => {
    expect(keywordCategory("Gasolio")).toBe("TRANSPORT");
    expect(keywordCategory("Barbiere")).toBeNull();
    expect(keywordCategory("Autonoleggio")).toBeNull();
  });

  it("con l'asterisco accetta l'inizio di parola", () => {
    expect(keywordCategory("Pizza")).toBe("RESTAURANTS");
    expect(keywordCategory("Due pizze")).toBe("RESTAURANTS");
    expect(keywordCategory("Bollette")).toBe("UTILITIES");
  });

  it("fra più categorie sceglie la parola più specifica", () => {
    expect(keywordCategory("Tasse universitarie")).toBe("EDUCATION");
    expect(keywordCategory("Bollo auto")).toBe("TAXES");
    expect(keywordCategory("Visita guidata al museo")).toBe("LEISURE");
  });

  it("conta «spesa» solo quando non c'è niente di più preciso", () => {
    expect(keywordCategory("Spesa")).toBe("GROCERIES");
    expect(keywordCategory("Spesa farmacia")).toBe("HEALTH");
    expect(keywordCategory("Spesa bar")).toBe("RESTAURANTS");
  });

  it("non propone niente quando non riconosce la descrizione", () => {
    expect(keywordCategory("Varie")).toBeNull();
    expect(keywordCategory("")).toBeNull();
  });
});

describe("historyKey", () => {
  it("ignora maiuscole, accenti, punteggiatura e cifre", () => {
    expect(historyKey("Bolletta luce 09/2026")).toBe("bolletta luce");
    expect(historyKey("  Ripetizioni   Però!  ")).toBe("ripetizioni pero");
  });
});

describe("buildCategoryHistory", () => {
  it("per ogni descrizione tiene la categoria della spesa più recente", () => {
    const history = buildCategoryHistory([
      { description: "Lezioni di Marco", category: "EDUCATION" },
      { description: "lezioni di marco", category: "LEISURE" },
    ]);
    expect(history).toEqual({ "lezioni di marco": "EDUCATION" });
  });

  it("salta le spese senza categoria", () => {
    const history = buildCategoryHistory([
      { description: "Lezioni di Marco", category: null },
      { description: "Lezioni di Marco", category: "EDUCATION" },
    ]);
    expect(history).toEqual({ "lezioni di marco": "EDUCATION" });
  });

  it("lascia fuori le voci che il dizionario riconosce già allo stesso modo", () => {
    expect(buildCategoryHistory([{ description: "Spesa Conad", category: "GROCERIES" }])).toEqual({});
  });

  it("una voce uguale al dizionario copre comunque quelle più vecchie", () => {
    const history = buildCategoryHistory([
      { description: "Pizzeria", category: "RESTAURANTS" },
      { description: "Pizzeria", category: "GIFTS" },
    ]);
    expect(suggestCategory("Pizzeria", history)).toBe("RESTAURANTS");
  });
});

describe("suggestCategory", () => {
  it("preferisce quello che il gruppo ha già scelto al dizionario", () => {
    const history = buildCategoryHistory([{ description: "Pizza con i colleghi", category: "LEISURE" }]);
    expect(suggestCategory("pizza con i colleghi", history)).toBe("LEISURE");
    expect(suggestCategory("Pizza", history)).toBe("RESTAURANTS");
  });

  it("riconosce la stessa descrizione anche con altre cifre", () => {
    const history = buildCategoryHistory([{ description: "Rata 3 Marco", category: "EDUCATION" }]);
    expect(suggestCategory("Rata 4 Marco", history)).toBe("EDUCATION");
  });

  it("senza storico usa il dizionario, e altrimenti non propone niente", () => {
    expect(suggestCategory("Farmacia")).toBe("HEALTH");
    expect(suggestCategory("Varie")).toBeNull();
  });

  it("non scambia le proprietà di ogni oggetto per voci dello storico", () => {
    expect(suggestCategory("constructor", {})).toBeNull();
    expect(suggestCategory("toString", {})).toBeNull();
  });
});

describe("planCategorization", () => {
  const expenses = [
    { id: "a", description: "Spesa Lidl", category: null },
    { id: "b", description: "Bolletta gas", category: null },
    { id: "c", description: "Lidl", category: null },
    { id: "d", description: "Varie", category: null },
    { id: "e", description: "Enel", category: "OTHER" as const },
    { id: "f", description: "Lezioni di Marco", category: null },
  ];

  it("raggruppa per categoria le spese senza categoria che riconosce", () => {
    const history = { "lezioni di marco": "EDUCATION" as const };
    expect(planCategorization(expenses, history)).toEqual([
      { category: "GROCERIES", expenseIds: ["a", "c"] },
      { category: "UTILITIES", expenseIds: ["b"] },
      { category: "EDUCATION", expenseIds: ["f"] },
    ]);
  });

  it("non tocca le spese che hanno già una categoria", () => {
    const ids = planCategorization(expenses, {}).flatMap((group) => group.expenseIds);
    expect(ids).not.toContain("e");
    expect(ids).not.toContain("d");
  });
});
