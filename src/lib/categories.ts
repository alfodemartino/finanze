import { normalizeForSearch } from "@/lib/text";

/**
 * Le categorie delle spese e il loro riconoscimento dalla descrizione.
 *
 * L'elenco è fisso e ricalca l'enum `ExpenseCategory` di `prisma/schema.prisma`
 * (un test verifica che coincidano). Qui ci sono etichette e parole chiave;
 * icone e colori, che sono interfaccia, stanno in `CategoryIcon`.
 *
 * Tutto è puro e gira anche nel browser: il form della nuova spesa propone la
 * categoria mentre si scrive, senza andare e tornare dal server.
 */

export const CATEGORY_IDS = [
  "GROCERIES",
  "RESTAURANTS",
  "HOME",
  "UTILITIES",
  "TRANSPORT",
  "TRAVEL",
  "HEALTH",
  "LEISURE",
  "CLOTHING",
  "EDUCATION",
  "PETS",
  "GIFTS",
  "TAXES",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof CATEGORY_IDS)[number];

type CategoryDefinition = {
  label: string;
  /**
   * Parole o frasi intere; con l'asterisco finale valgono come inizio di
   * parola («pizz*» trova pizza, pizze e pizzeria). Le parole intere sono la
   * regola perché i prefissi nudi sbagliano: «gas» troverebbe «gasolio», «bar»
   * troverebbe «barbiere».
   *
   * Nel dubbio una parola resta fuori: meglio nessun suggerimento che uno
   * sbagliato. Per questo mancano «amazon», «compleanno», «ricarica», «acqua».
   */
  keywords: string[];
  /** Parole che indicano la categoria solo quando nient'altro la indica. */
  generic?: string[];
};

export const CATEGORIES: Record<ExpenseCategory, CategoryDefinition> = {
  GROCERIES: {
    label: "Spesa alimentare",
    keywords: [
      "supermercato", "supermarket", "ipermercato", "iper", "discount", "alimentari",
      "conad", "coop", "ipercoop", "esselunga", "carrefour", "lidl", "eurospin", "penny",
      "aldi", "pam", "despar", "eurospar", "interspar", "crai", "sigma", "famila", "todis",
      "bennet", "iperal", "tigota", "naturasi",
      "macelleria", "salumeria", "pescheria", "panificio", "panetteria", "pane",
      "fruttivendolo", "ortofrutta", "frutta", "verdura", "mercato", "detersivi",
    ],
    generic: ["spesa"],
  },
  RESTAURANTS: {
    label: "Ristoranti e bar",
    keywords: [
      "ristorant*", "pizz*", "trattoria", "osteria", "braceria", "rosticceria",
      "friggitoria", "paninoteca", "piadin*", "cena", "pranzo", "colazione", "aperitivo",
      "apericena", "bar", "caffè", "cornett*", "gelat*", "pasticceria", "pub", "birreria",
      "sushi", "kebab", "hamburger*", "burger", "mcdonald*", "autogrill", "asporto",
      "take away", "deliveroo", "just eat", "glovo",
    ],
  },
  HOME: {
    label: "Casa",
    keywords: [
      "affitto", "mutuo", "condomin*", "ikea", "leroy merlin", "brico*", "ferramenta",
      "idraulico", "elettricista", "falegname", "muratore", "imbianchino", "caldaia",
      "condizionatore", "climatizzatore", "arredament*", "mobili", "divano", "materasso",
      "elettrodomestic*", "lavatrice", "lavastoviglie", "frigorifero", "pulizie", "colf",
      "tende", "lampadin*",
    ],
  },
  UTILITIES: {
    label: "Bollette",
    keywords: [
      "bollett*", "luce", "gas", "energia elettrica", "enel", "plenitude", "edison", "a2a",
      "hera", "iren", "acea", "sorgenia", "servizio elettrico", "internet", "fibra",
      "wifi", "adsl", "tim", "vodafone", "windtre", "wind tre", "iliad", "fastweb",
      "ho mobile", "very mobile", "kena", "tari", "rifiuti", "canone rai",
      "ricarica telefonica", "ricarica cellulare",
    ],
  },
  TRANSPORT: {
    label: "Trasporti",
    keywords: [
      "benzina", "gasolio", "diesel", "carburante", "rifornimento", "gpl", "metano",
      "autostrad*", "pedaggio", "telepass", "parcheggio", "tagliando", "meccanico",
      "gommista", "gomme", "pneumatic*", "revisione", "carrozzeria", "carrozziere",
      "autolavaggio", "auto", "moto", "scooter", "scuola guida", "autoscuola",
      "treno", "trenitalia", "frecciarossa", "autobus", "bus", "metro",
      "metropolitana", "circumvesuviana", "funicolare", "flixbus", "taxi", "uber",
      "car sharing", "monopattino",
    ],
  },
  TRAVEL: {
    label: "Viaggi e vacanze",
    keywords: [
      "hotel", "albergo", "b&b", "bed and breakfast", "airbnb", "booking", "agriturismo",
      "campeggio", "casa vacanze", "volo", "voli", "aereo", "aeroporto", "ryanair",
      "easyjet", "ita airways", "wizz air", "traghett*", "aliscafo", "crociera",
      "vacanz*", "viaggi*", "noleggio auto", "escursion*", "souvenir",
    ],
  },
  HEALTH: {
    label: "Salute",
    keywords: [
      "farmaci*", "parafarmacia", "medicin*", "medico", "dottore", "dentista",
      "odontoiatr*", "oculista", "pediatra", "ortopedico", "ginecolog*", "dermatolog*",
      "cardiolog*", "visita", "visite", "analisi", "esami del sangue", "ecografia",
      "radiografia", "risonanza", "ticket", "ticket sanitario", "ospedale",
      "pronto soccorso", "fisioterap*", "osteopat*", "psicolog*", "logoped*", "vaccin*",
      "ottico", "occhiali", "lenti a contatto",
    ],
  },
  LEISURE: {
    label: "Svago e sport",
    keywords: [
      "cinema", "teatro", "concert*", "museo", "musei", "mostra", "visita guidata",
      "spettacolo", "festival", "stadio", "partita", "salernitana", "palestra", "piscina",
      "padel", "calcetto", "tennis", "nuoto", "yoga", "pilates", "decathlon", "terme",
      "netflix", "spotify", "disney", "prime video", "dazn", "sky", "now tv", "apple tv",
      "youtube premium", "videogioc*", "playstation", "xbox", "nintendo", "libro", "libri",
      "zoo", "acquario", "luna park", "giostre", "bowling", "discoteca", "karaoke",
      "escape room",
    ],
  },
  CLOTHING: {
    label: "Abbigliamento",
    keywords: [
      "abbigliamento", "vestit*", "scarp*", "sneakers", "stivali", "sandali", "maglia",
      "maglion*", "maglietta", "magliette", "felpa", "pantaloni", "jeans", "gonna",
      "giacca", "giubbotto", "cappotto", "camicia", "intimo", "calze", "calzini",
      "pigiama", "costume da bagno", "zara", "h&m", "ovs", "primark", "calzedonia",
      "intimissimi", "benetton", "piazza italia", "zalando", "uniqlo",
    ],
  },
  EDUCATION: {
    label: "Istruzione",
    keywords: [
      "scuola", "scolastic*", "mensa", "retta", "asilo", "universit*", "tasse universitarie",
      "quaderni", "cancelleria", "astuccio", "ripetizion*", "doposcuola", "centro estivo",
      "campo estivo",
    ],
  },
  PETS: {
    label: "Animali",
    keywords: [
      "veterinari*", "crocchette", "lettiera", "toelettatura", "antipulci", "guinzaglio",
      "pet shop", "arcaplanet", "zooplus", "maxi zoo", "cane", "cani", "gatto", "gatti",
    ],
  },
  GIFTS: {
    label: "Regali",
    keywords: ["regal*", "fiori", "fioraio", "fioreria", "bomboniere", "lista nozze", "pensierino"],
  },
  TAXES: {
    label: "Tasse e assicurazioni",
    keywords: [
      "tasse", "tassa", "imu", "f24", "730", "partita iva", "agenzia delle entrate",
      "multa", "multe", "contravvenzione", "bollo auto", "commercialista", "notaio",
      "assicurazion*", "polizza", "rc auto",
    ],
  },
  OTHER: {
    label: "Altro",
    keywords: [],
  },
};

/** L'etichetta da mostrare, anche per una spesa ancora senza categoria. */
export function categoryLabel(category: ExpenseCategory | null): string {
  return category ? CATEGORIES[category].label : "Senza categoria";
}

/**
 * La forma in cui descrizione e parole chiave si confrontano: minuscole, senza
 * accenti, con la punteggiatura ridotta a spazi. «Caffè!» e «caffe» diventano
 * la stessa cosa.
 */
export function normalizeDescription(text: string): string {
  return normalizeForSearch(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type CompiledKeyword = { category: ExpenseCategory; text: string; prefix: boolean };

function compile(category: ExpenseCategory, keyword: string): CompiledKeyword {
  const prefix = keyword.endsWith("*");
  return { category, text: normalizeDescription(keyword), prefix };
}

// Si preparano una volta sola: il form le riusa a ogni tasto.
const KEYWORDS = CATEGORY_IDS.flatMap((id) => CATEGORIES[id].keywords.map((k) => compile(id, k)));
const GENERIC = CATEGORY_IDS.flatMap((id) => (CATEGORIES[id].generic ?? []).map((k) => compile(id, k)));

/**
 * La categoria indicata dalla parola chiave più lunga: la più specifica. In
 * «Assicurazione auto» vince «assicurazione» su «auto», in «Tasse
 * universitarie» vince la frase intera su «tasse». A pari lunghezza conta
 * l'ordine dell'elenco.
 */
function bestMatch(padded: string, keywords: CompiledKeyword[]): ExpenseCategory | null {
  let best: CompiledKeyword | null = null;
  for (const keyword of keywords) {
    // Gli spazi ai lati del testo fanno da confine di parola.
    const found = padded.includes(` ${keyword.text}${keyword.prefix ? "" : " "}`);
    if (found && (!best || keyword.text.length > best.text.length)) best = keyword;
  }
  return best?.category ?? null;
}

/**
 * La categoria che il dizionario riconosce nella descrizione, oppure `null`.
 * Le parole generiche contano solo se non c'è altro: «Spesa» da sola è la
 * spesa alimentare, «Spesa farmacia» è salute.
 */
export function keywordCategory(description: string): ExpenseCategory | null {
  const padded = ` ${normalizeDescription(description)} `;
  return bestMatch(padded, KEYWORDS) ?? bestMatch(padded, GENERIC);
}

/**
 * Come il gruppo ha categorizzato le sue spese, per descrizione: la chiave è la
 * descrizione normalizzata e senza cifre, così «Bolletta luce 09/2026» e
 * «Bolletta luce 10/2026» sono la stessa voce.
 */
export type CategoryHistory = Record<string, ExpenseCategory>;

export function historyKey(description: string): string {
  return normalizeDescription(description).replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Lo storico delle categorie di un gruppo. Le spese vanno passate dalla più
 * recente: per ogni descrizione vale l'ultima categoria data, così una
 * correzione fatta a mano insegna subito.
 *
 * Restano fuori le voci su cui lo storico dice la stessa cosa del dizionario:
 * il suggerimento non cambia, e la pagina che le porta al browser pesa meno.
 */
export function buildCategoryHistory(
  expenses: { description: string; category: ExpenseCategory | null }[],
): CategoryHistory {
  const history: CategoryHistory = {};
  const seen = new Set<string>();

  for (const expense of expenses) {
    if (!expense.category) continue;
    const key = historyKey(expense.description);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (keywordCategory(expense.description) !== expense.category) {
      history[key] = expense.category;
    }
  }
  return history;
}

/**
 * La categoria da proporre per una descrizione: prima quella che il gruppo ha
 * già dato alla stessa descrizione, poi quella del dizionario, altrimenti
 * nessuna.
 */
export function suggestCategory(
  description: string,
  history: CategoryHistory = {},
): ExpenseCategory | null {
  const key = historyKey(description);
  // `Object.hasOwn`, non `history[key]`: una descrizione come «constructor»
  // troverebbe le proprietà che ogni oggetto eredita.
  if (key && Object.hasOwn(history, key)) return history[key];
  return keywordCategory(description);
}

/**
 * Le spese senza categoria che si possono categorizzare in automatico,
 * raggruppate per categoria nell'ordine dell'elenco. Quelle con una categoria
 * non si toccano: potrebbe averla scelta qualcuno.
 */
export function planCategorization(
  expenses: { id: string; description: string; category: ExpenseCategory | null }[],
  history: CategoryHistory,
): { category: ExpenseCategory; expenseIds: string[] }[] {
  const byCategory = new Map<ExpenseCategory, string[]>();
  for (const expense of expenses) {
    if (expense.category) continue;
    const category = suggestCategory(expense.description, history);
    if (!category) continue;
    const ids = byCategory.get(category);
    if (ids) ids.push(expense.id);
    else byCategory.set(category, [expense.id]);
  }

  return CATEGORY_IDS.filter((id) => byCategory.has(id)).map((category) => ({
    category,
    expenseIds: byCategory.get(category)!,
  }));
}
