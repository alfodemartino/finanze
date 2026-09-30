import { describe, expect, it } from "vitest";
import { ExpenseCategory as PrismaExpenseCategory } from "@prisma/client";
import {
  baseKeywordCategory,
  buildCategoryHistory,
  buildDictionary,
  CATEGORIES,
  CATEGORY_DISPLAY_ORDER,
  CATEGORY_IDS,
  categoryLabel,
  describeKeywords,
  historyKey,
  keywordCategory,
  keywordKey,
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
        const key = keywordKey(keyword);
        const previous = owner.get(key);
        if (previous && previous !== id) duplicates.push(`${keyword} (${previous}, ${id})`);
        owner.set(key, id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it("si mostra in ordine alfabetico, con «Altro» in fondo", () => {
    expect([...CATEGORY_DISPLAY_ORDER].sort()).toEqual([...CATEGORY_IDS].sort());
    expect(CATEGORY_DISPLAY_ORDER.at(-1)).toBe("OTHER");
    const labels = CATEGORY_DISPLAY_ORDER.slice(0, -1).map((id) => CATEGORIES[id].label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "it")));
    expect(labels[0]).toBe("Abbigliamento");
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
    ["Pacchetto di sigarette", "SMOKING"],
    ["Pannolini", "CHILDREN"],
    ["Parrucchiere", "PERSONAL_CARE"],
    ["Tigotà", "PERSONAL_CARE"],
    ["Cuffie bluetooth", "TECHNOLOGY"],
    ["Donazione Telethon", "CHARITY"],
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
    expect(keywordCategory("Barattoli")).toBeNull();
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
      // Nell'ordine in cui si mostrano: Bollette, Istruzione, Spesa alimentare.
      { category: "UTILITIES", expenseIds: ["b"] },
      { category: "EDUCATION", expenseIds: ["f"] },
      { category: "GROCERIES", expenseIds: ["a", "c"] },
    ]);
  });

  it("non tocca le spese che hanno già una categoria", () => {
    const ids = planCategorization(expenses, {}).flatMap((group) => group.expenseIds);
    expect(ids).not.toContain("e");
    expect(ids).not.toContain("d");
  });
});

describe("keywordKey", () => {
  it("normalizza la parola e conserva l'asterisco finale", () => {
    expect(keywordKey("  Pizz* ")).toBe("pizz*");
    expect(keywordKey("Caffè")).toBe("caffe");
    expect(keywordKey("B&B")).toBe("b b");
    expect(keywordKey("*")).toBe("");
  });
});

describe("buildDictionary", () => {
  it("senza correzioni riconosce come il dizionario di base", () => {
    const dictionary = buildDictionary([]);
    expect(keywordCategory("Pizzeria", dictionary)).toBe("RESTAURANTS");
    expect(keywordCategory("Spesa", dictionary)).toBe("GROCERIES");
  });

  it("riconosce una parola aggiunta dal gruppo", () => {
    const dictionary = buildDictionary([{ keyword: "Lezioni di Marco", category: "EDUCATION" }]);
    expect(keywordCategory("Lezioni di Marco martedì", dictionary)).toBe("EDUCATION");
    expect(keywordCategory("Lezioni di Marco")).toBeNull();
  });

  it("accetta l'asterisco anche nelle parole del gruppo", () => {
    const dictionary = buildDictionary([{ keyword: "salernit*", category: "LEISURE" }]);
    expect(keywordCategory("Abbonamento Salernitana", dictionary)).toBe("LEISURE");
  });

  it("non riconosce più una parola di base disattivata", () => {
    const dictionary = buildDictionary([{ keyword: "bar", category: null }]);
    expect(keywordCategory("Bar", dictionary)).toBeNull();
    expect(keywordCategory("Caffè al bar", dictionary)).toBe("RESTAURANTS");
  });

  it("sposta una parola di base in un'altra categoria", () => {
    const dictionary = buildDictionary([{ keyword: "Auto", category: "TRAVEL" }]);
    expect(keywordCategory("Auto", dictionary)).toBe("TRAVEL");
    // La parola più lunga vince ancora, anche su quelle del gruppo.
    expect(keywordCategory("Bollo auto", dictionary)).toBe("TAXES");
  });

  it("disattiva anche una parola generica", () => {
    const dictionary = buildDictionary([{ keyword: "spesa", category: null }]);
    expect(keywordCategory("Spesa", dictionary)).toBeNull();
    expect(keywordCategory("Spesa Conad", dictionary)).toBe("GROCERIES");
  });

  it("si propaga a storico, suggerimento e categorizzazione", () => {
    const dictionary = buildDictionary([{ keyword: "palestra", category: "HEALTH" }]);
    const expenses = [{ id: "a", description: "Palestra", category: "HEALTH" as const }];
    const history = buildCategoryHistory(expenses, dictionary);
    // Il dizionario del gruppo dice già HEALTH: lo storico non serve.
    expect(history).toEqual({});
    expect(suggestCategory("Palestra", history, dictionary)).toBe("HEALTH");
    expect(
      planCategorization([{ id: "b", description: "Palestra", category: null }], history, dictionary),
    ).toEqual([{ category: "HEALTH", expenseIds: ["b"] }]);
  });
});

describe("baseKeywordCategory", () => {
  it("dice dove il dizionario di base mette una parola", () => {
    expect(baseKeywordCategory("Pizz*")).toBe("RESTAURANTS");
    expect(baseKeywordCategory("pizz")).toBeNull();
    expect(baseKeywordCategory("spesa")).toBe("GROCERIES");
  });
});

describe("describeKeywords", () => {
  it("distingue parole di base, aggiunte, spostate e disattivate", () => {
    const { byCategory, disabled } = describeKeywords([
      { keyword: "lezioni di marco", category: "EDUCATION" },
      { keyword: "auto", category: "TRAVEL" },
      { keyword: "bar", category: null },
      { keyword: "parola inesistente", category: null },
    ]);
    expect(byCategory.EDUCATION).toContainEqual({
      key: "lezioni di marco",
      text: "lezioni di marco",
      origin: "added",
    });
    expect(byCategory.TRAVEL).toContainEqual({
      key: "auto",
      text: "auto",
      origin: "moved",
      from: "TRANSPORT",
    });
    expect(byCategory.TRANSPORT.map((entry) => entry.key)).not.toContain("auto");
    expect(byCategory.RESTAURANTS.map((entry) => entry.key)).not.toContain("bar");
    expect(disabled).toEqual([{ key: "bar", text: "bar", category: "RESTAURANTS" }]);
  });

  it("mostra le parole di base come sono scritte nel dizionario", () => {
    const texts = describeKeywords([]).byCategory.RESTAURANTS.map((entry) => entry.text);
    expect(texts).toContain("caffè");
  });

  it("mette le parole in ordine alfabetico", () => {
    const keys = describeKeywords([]).byCategory.GIFTS.map((entry) => entry.text);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b, "it")));
    expect(describeKeywords([]).byCategory.OTHER).toEqual([]);
  });
});
