/**
 * I periodi su cui si sommano le spese: un mese o un anno, scritti
 * nell'indirizzo come `?periodo=2026-09` o `?periodo=2026`.
 *
 * Le date delle spese sono salvate a mezzanotte UTC del giorno scelto nel form
 * (`new Date("2026-09-29")`), quindi i confini dei periodi si calcolano in UTC:
 * una spesa del 30 settembre cade in settembre qualunque sia il fuso di chi la
 * guarda. Solo «oggi» si legge sull'ora italiana, perché è lì che vive l'app.
 */

export type PeriodKind = "month" | "year";

export type Period = {
  kind: PeriodKind;
  /** Il valore per l'indirizzo: «2026-09» o «2026». */
  key: string;
  /** Primo istante del periodo, compreso. */
  start: Date;
  /** Primo istante dopo il periodo, escluso. */
  end: Date;
  /** «settembre 2026» o «2026». */
  label: string;
  /** Il periodo con la preposizione: «a settembre 2026», «nel 2026». */
  inLabel: string;
  previous: string;
  /** `null` sul periodo in corso: oltre non ci sono spese da vedere. */
  next: string | null;
  /** Lo stesso momento visto come mese e come anno, per il controllo segmentato. */
  asMonth: string;
  asYear: string;
};

type YearMonth = { year: number; month: number };

/** Anno e mese di oggi in Italia: a mezzanotte e mezza del 1° è già il mese nuovo. */
export function italianToday(now: Date): YearMonth {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month") };
}

const monthKey = ({ year, month }: YearMonth) => `${year}-${String(month).padStart(2, "0")}`;

const monthLabel = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function monthPeriod(ym: YearMonth, today: YearMonth): Period {
  const start = new Date(Date.UTC(ym.year, ym.month - 1, 1));
  const label = monthLabel.format(start);
  const isCurrentOrLater = monthKey(ym) >= monthKey(today);
  return {
    kind: "month",
    key: monthKey(ym),
    start,
    end: new Date(Date.UTC(ym.year, ym.month, 1)),
    label,
    // La «d» eufonica solo davanti alla stessa vocale: «ad agosto», «ad
    // aprile», ma «a ottobre».
    inLabel: `${label.startsWith("a") ? "ad" : "a"} ${label}`,
    previous: monthKey(shiftMonth(ym, -1)),
    next: isCurrentOrLater ? null : monthKey(shiftMonth(ym, 1)),
    asMonth: monthKey(ym),
    asYear: String(ym.year),
  };
}

function yearPeriod(year: number, today: YearMonth): Period {
  return {
    kind: "year",
    key: String(year),
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
    label: String(year),
    inLabel: `nel ${year}`,
    previous: String(year - 1),
    next: year >= today.year ? null : String(year + 1),
    // Da un anno al mese: quello in corso se l'anno è questo, altrimenti
    // dicembre, l'ultimo mese di quell'anno.
    asMonth: monthKey({ year, month: year === today.year ? today.month : 12 }),
    asYear: String(year),
  };
}

// Prima del 1970 un gruppo non poteva avere spese, e `Date.UTC` interpreta a
// modo suo gli anni a due cifre: un valore così è un indirizzo scritto male.
const validYear = (year: number) => year >= 1970 && year <= 9999;

/**
 * Il periodo chiesto dall'indirizzo. Un valore mancante o scritto male porta al
 * mese in corso, senza errori: è un filtro, non un dato da proteggere.
 */
export function parsePeriod(value: string | undefined, now = new Date()): Period {
  const today = italianToday(now);
  const raw = (value ?? "").trim();

  const month = /^(\d{4})-(\d{2})$/.exec(raw);
  if (month) {
    const ym = { year: Number(month[1]), month: Number(month[2]) };
    if (validYear(ym.year) && ym.month >= 1 && ym.month <= 12) return monthPeriod(ym, today);
  }

  const year = /^(\d{4})$/.exec(raw);
  if (year && validYear(Number(year[1]))) return yearPeriod(Number(year[1]), today);

  return monthPeriod(today, today);
}
