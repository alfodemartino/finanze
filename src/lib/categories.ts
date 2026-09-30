import { normalizeForSearch } from "@/lib/text";

/**
 * Le categorie delle spese e il loro riconoscimento dalla descrizione.
 *
 * L'elenco è fisso e ricalca l'enum `ExpenseCategory` di `prisma/schema.prisma`
 * (un test verifica che coincidano). Qui ci sono etichette e parole chiave;
 * icone e colori, che sono interfaccia, stanno in `CategoryIcon`.
 *
 * Le parole chiave di questo file sono il dizionario di base. Ogni gruppo può
 * correggerlo — aggiungere una parola, spostarla, disattivarla — e le sue
 * correzioni stanno nella tabella `CategoryKeyword`: `buildDictionary` le
 * applica alla base.
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
  "SMOKING",
  "CHILDREN",
  "PERSONAL_CARE",
  "TECHNOLOGY",
  "CHARITY",
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
      "bennet", "iperal", "naturasi",
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
  SMOKING: {
    label: "Sigarette",
    // Niente «tabacchi» né «tabaccheria»: dal tabaccaio si pagano anche bollo,
    // ricariche e francobolli.
    keywords: [
      "sigarett*", "tabacco", "trinciato", "cartine", "iqos", "heets", "terea", "svapo",
      "liquidi svapo",
    ],
  },
  CHILDREN: {
    label: "Figli",
    keywords: [
      "pannolin*", "babysitter", "baby sitter", "giocattol*", "passeggino", "seggiolino",
      "omogeneizzat*", "latte in polvere", "ludoteca", "prenatal",
    ],
  },
  PERSONAL_CARE: {
    label: "Cura della persona",
    keywords: [
      "parrucchier*", "barbiere", "estetista", "centro estetico", "manicure", "pedicure",
      "ceretta", "profumeria", "profumo", "cosmetic*", "sephora", "douglas", "kiko",
      "tigota", "acqua e sapone", "shampoo", "bagnoschiuma", "dentifricio", "deodorante",
      "rasoio",
    ],
  },
  TECHNOLOGY: {
    label: "Tecnologia",
    keywords: [
      "elettronica", "mediaworld", "unieuro", "euronics", "trony", "computer", "pc",
      "notebook", "tablet", "ipad", "iphone", "smartphone", "cuffie", "auricolari",
      "stampante", "cartucce", "toner", "caricabatterie", "hard disk", "apple store",
      "icloud", "google one", "microsoft 365",
    ],
  },
  CHARITY: {
    label: "Beneficenza",
    // Niente «offerta», che più spesso è un'offerta speciale.
    keywords: [
      "beneficenza", "donazion*", "raccolta fondi", "onlus", "unicef", "emergency",
      "telethon", "airc", "caritas", "gofundme",
    ],
  },
  OTHER: {
    label: "Altro",
    keywords: [],
  },
};

/**
 * L'ordine in cui le categorie si mostrano: alfabetico per etichetta, con
 * «Altro» sempre in fondo perché raccoglie quello che non sta altrove.
 *
 * `CATEGORY_IDS` resta com'è: a parità di lunghezza è il suo ordine a decidere
 * quale parola chiave vince, e cambiarlo cambierebbe i suggerimenti.
 */
export const CATEGORY_DISPLAY_ORDER: readonly ExpenseCategory[] = [
  ...CATEGORY_IDS.filter((id) => id !== "OTHER").sort((a, b) =>
    CATEGORIES[a].label.localeCompare(CATEGORIES[b].label, "it"),
  ),
  "OTHER",
];

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

/**
 * La forma in cui una parola chiave si salva e si confronta: normalizzata come
 * le descrizioni, con l'asterisco finale se c'era. «Pizz*» e «pizz *» sono la
 * stessa parola, «pizz» un'altra.
 */
export function keywordKey(keyword: string): string {
  const text = normalizeDescription(keyword);
  return text && keyword.trim().endsWith("*") ? `${text}*` : text;
}

/** Come un gruppo corregge una parola: vedi il modello `CategoryKeyword`. */
export type KeywordOverride = { keyword: string; category: ExpenseCategory | null };

type BaseKeyword = { key: string; text: string; category: ExpenseCategory; generic: boolean };

const BASE_KEYWORDS: BaseKeyword[] = CATEGORY_IDS.flatMap((id) => [
  ...CATEGORIES[id].keywords.map((text) => ({ key: keywordKey(text), text, category: id, generic: false })),
  ...(CATEGORIES[id].generic ?? []).map((text) => ({
    key: keywordKey(text),
    text,
    category: id,
    generic: true,
  })),
]);

const BASE_BY_KEY = new Map(BASE_KEYWORDS.map((base) => [base.key, base]));

/** La categoria in cui il dizionario di base mette una parola, se c'è. */
export function baseKeywordCategory(keyword: string): ExpenseCategory | null {
  return BASE_BY_KEY.get(keywordKey(keyword))?.category ?? null;
}

type CompiledKeyword = { category: ExpenseCategory; text: string; prefix: boolean };

function compile(category: ExpenseCategory, key: string): CompiledKeyword {
  return { category, text: normalizeDescription(key), prefix: key.endsWith("*") };
}

/** Le parole chiave pronte per il confronto: vedi `buildDictionary`. */
export type CategoryDictionary = { keywords: CompiledKeyword[]; generic: CompiledKeyword[] };

/**
 * Il dizionario di un gruppo: la base, meno le parole che il gruppo ha
 * corretto, più quelle a cui ha dato una categoria. Una parola spostata da una
 * categoria all'altra perde anche l'eventuale natura di parola generica: è il
 * gruppo ad averla indicata, e vale quanto le altre.
 *
 * Va preparato una volta sola e poi riusato: il form lo interroga a ogni tasto.
 */
export function buildDictionary(overrides: KeywordOverride[] = []): CategoryDictionary {
  const overridden = new Map(overrides.map((o) => [keywordKey(o.keyword), o.category]));
  const dictionary: CategoryDictionary = { keywords: [], generic: [] };

  for (const base of BASE_KEYWORDS) {
    if (overridden.has(base.key)) continue;
    (base.generic ? dictionary.generic : dictionary.keywords).push(compile(base.category, base.key));
  }
  for (const [key, category] of overridden) {
    if (key && category) dictionary.keywords.push(compile(category, key));
  }
  return dictionary;
}

const BASE_DICTIONARY = buildDictionary();

/** Una parola chiave in vigore in un gruppo, com'è arrivata lì. */
export type KeywordEntry = {
  key: string;
  /** Come mostrarla: le parole di base come sono scritte qui («caffè», «b&b»). */
  text: string;
  /** Dal dizionario di base, aggiunta dal gruppo, o spostata da `from`. */
  origin: "base" | "added" | "moved";
  from?: ExpenseCategory;
};

/**
 * Le parole chiave di un gruppo come le mostra la pagina delle categorie: per
 * ogni categoria quelle in vigore, in ordine alfabetico, e a parte le parole
 * di base che il gruppo ha disattivato.
 */
export function describeKeywords(overrides: KeywordOverride[]): {
  byCategory: Record<ExpenseCategory, KeywordEntry[]>;
  disabled: { key: string; text: string; category: ExpenseCategory }[];
} {
  const overridden = new Map(overrides.map((o) => [keywordKey(o.keyword), o.category]));
  const byCategory = Object.fromEntries(CATEGORY_IDS.map((id) => [id, []])) as unknown as Record<
    ExpenseCategory,
    KeywordEntry[]
  >;
  const disabled: { key: string; text: string; category: ExpenseCategory }[] = [];

  for (const base of BASE_KEYWORDS) {
    if (!overridden.has(base.key)) {
      byCategory[base.category].push({ key: base.key, text: base.text, origin: "base" });
    }
  }
  for (const [key, category] of overridden) {
    const base = BASE_BY_KEY.get(key);
    if (category) {
      byCategory[category].push(
        base
          ? { key, text: base.text, origin: "moved", from: base.category }
          : { key, text: key, origin: "added" },
      );
    } else if (base) {
      disabled.push({ key, text: base.text, category: base.category });
    }
  }

  const byKey = (a: { text: string }, b: { text: string }) => a.text.localeCompare(b.text, "it");
  for (const id of CATEGORY_IDS) byCategory[id].sort(byKey);
  disabled.sort(byKey);
  return { byCategory, disabled };
}

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
export function keywordCategory(
  description: string,
  dictionary: CategoryDictionary = BASE_DICTIONARY,
): ExpenseCategory | null {
  const padded = ` ${normalizeDescription(description)} `;
  return bestMatch(padded, dictionary.keywords) ?? bestMatch(padded, dictionary.generic);
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
  dictionary: CategoryDictionary = BASE_DICTIONARY,
): CategoryHistory {
  const history: CategoryHistory = {};
  const seen = new Set<string>();

  for (const expense of expenses) {
    if (!expense.category) continue;
    const key = historyKey(expense.description);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (keywordCategory(expense.description, dictionary) !== expense.category) {
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
  dictionary: CategoryDictionary = BASE_DICTIONARY,
): ExpenseCategory | null {
  const key = historyKey(description);
  // `Object.hasOwn`, non `history[key]`: una descrizione come «constructor»
  // troverebbe le proprietà che ogni oggetto eredita.
  if (key && Object.hasOwn(history, key)) return history[key];
  return keywordCategory(description, dictionary);
}

/**
 * Le spese senza categoria che si possono categorizzare in automatico,
 * raggruppate per categoria nell'ordine in cui si mostrano. Quelle con una categoria
 * non si toccano: potrebbe averla scelta qualcuno.
 */
export function planCategorization(
  expenses: { id: string; description: string; category: ExpenseCategory | null }[],
  history: CategoryHistory,
  dictionary: CategoryDictionary = BASE_DICTIONARY,
): { category: ExpenseCategory; expenseIds: string[] }[] {
  const byCategory = new Map<ExpenseCategory, string[]>();
  for (const expense of expenses) {
    if (expense.category) continue;
    const category = suggestCategory(expense.description, history, dictionary);
    if (!category) continue;
    const ids = byCategory.get(category);
    if (ids) ids.push(expense.id);
    else byCategory.set(category, [expense.id]);
  }

  return CATEGORY_DISPLAY_ORDER.filter((id) => byCategory.has(id)).map((category) => ({
    category,
    expenseIds: byCategory.get(category)!,
  }));
}
