import { describe, expect, it } from "vitest";
import { italianToday, parsePeriod } from "@/lib/periods";

// Il 29 settembre 2026 a metà giornata, ora italiana.
const oggi = new Date("2026-09-29T10:00:00Z");

describe("italianToday", () => {
  it("passa al mese nuovo a mezzanotte italiana, non a quella UTC", () => {
    // 00:30 del 1° ottobre in Italia, ma ancora 30 settembre in UTC.
    expect(italianToday(new Date("2026-09-30T22:30:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(italianToday(new Date("2026-09-30T21:30:00Z"))).toEqual({ year: 2026, month: 9 });
  });
});

describe("parsePeriod", () => {
  it("senza valore apre il mese in corso", () => {
    const period = parsePeriod(undefined, oggi);
    expect(period.kind).toBe("month");
    expect(period.key).toBe("2026-09");
    expect(period.label).toBe("settembre 2026");
    expect(period.next).toBeNull();
  });

  it("torna al mese in corso con un valore scritto male", () => {
    for (const valore of ["abc", "2026-13", "2026-00", "26-09", "0099", "2026-9", ""]) {
      expect(parsePeriod(valore, oggi).key).toBe("2026-09");
    }
  });

  it("delimita un mese in UTC, fine esclusa", () => {
    const period = parsePeriod("2026-02", oggi);
    expect(period.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("scavalca l'anno andando avanti e indietro", () => {
    expect(parsePeriod("2026-01", oggi).previous).toBe("2025-12");
    expect(parsePeriod("2025-12", oggi).next).toBe("2026-01");
  });

  it("non va oltre il periodo in corso", () => {
    expect(parsePeriod("2026-08", oggi).next).toBe("2026-09");
    expect(parsePeriod("2026-09", oggi).next).toBeNull();
    expect(parsePeriod("2026", oggi).next).toBeNull();
    expect(parsePeriod("2025", oggi).next).toBe("2026");
  });

  it("delimita un anno intero", () => {
    const period = parsePeriod("2025", oggi);
    expect(period.kind).toBe("year");
    expect(period.start.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(period.previous).toBe("2024");
    expect(period.inLabel).toBe("nel 2025");
  });

  it("passa da mese ad anno e ritorno", () => {
    expect(parsePeriod("2025-04", oggi).asYear).toBe("2025");
    expect(parsePeriod("2026", oggi).asMonth).toBe("2026-09");
    expect(parsePeriod("2025", oggi).asMonth).toBe("2025-12");
  });

  it("mette la preposizione giusta", () => {
    expect(parsePeriod("2026-08", oggi).inLabel).toBe("ad agosto 2026");
    expect(parsePeriod("2026-04", oggi).inLabel).toBe("ad aprile 2026");
    expect(parsePeriod("2025-10", oggi).inLabel).toBe("a ottobre 2025");
    expect(parsePeriod("2026-09", oggi).inLabel).toBe("a settembre 2026");
  });
});
