import { describe, expect, it } from "vitest";
import { computeSplits, resplitTotal, SplitError } from "@/lib/split";

const members = [{ memberId: "a" }, { memberId: "b" }, { memberId: "c" }];

describe("computeSplits", () => {
  it("divide in parti uguali distribuendo il resto", () => {
    const splits = computeSplits(1000, "EQUAL", members);
    expect(splits).toEqual([
      { memberId: "a", amountCents: 334 },
      { memberId: "b", amountCents: 333 },
      { memberId: "c", amountCents: 333 },
    ]);
  });

  it("divide per quote", () => {
    const splits = computeSplits(10000, "SHARES", [
      { memberId: "a", shareWeight: 60 },
      { memberId: "b", shareWeight: 40 },
    ]);
    expect(splits).toEqual([
      { memberId: "a", amountCents: 6000 },
      { memberId: "b", amountCents: 4000 },
    ]);
  });

  it("accetta gli importi esatti se la somma torna", () => {
    const splits = computeSplits(1000, "EXACT", [
      { memberId: "a", amountCents: 700 },
      { memberId: "b", amountCents: 300 },
    ]);
    expect(splits.map((s) => s.amountCents)).toEqual([700, 300]);
  });

  it("rifiuta gli importi esatti che non tornano", () => {
    expect(() =>
      computeSplits(1000, "EXACT", [
        { memberId: "a", amountCents: 700 },
        { memberId: "b", amountCents: 200 },
      ]),
    ).toThrow(SplitError);
  });

  it("rifiuta importi non validi o senza partecipanti", () => {
    expect(() => computeSplits(0, "EQUAL", members)).toThrow(SplitError);
    expect(() => computeSplits(-100, "EQUAL", members)).toThrow(SplitError);
    expect(() => computeSplits(1000, "EQUAL", [])).toThrow(SplitError);
    expect(() =>
      computeSplits(1000, "SHARES", [{ memberId: "a", shareWeight: 0 }]),
    ).toThrow(SplitError);
  });

  it("qualunque sia la modalità, la somma delle quote è il totale", () => {
    for (const total of [1, 7, 999, 10000, 123457]) {
      const equal = computeSplits(total, "EQUAL", members);
      expect(equal.reduce((sum, s) => sum + s.amountCents, 0)).toBe(total);

      const shares = computeSplits(total, "SHARES", [
        { memberId: "a", shareWeight: 55 },
        { memberId: "b", shareWeight: 30 },
        { memberId: "c", shareWeight: 15 },
      ]);
      expect(shares.reduce((sum, s) => sum + s.amountCents, 0)).toBe(total);
    }
  });
});

describe("resplitTotal", () => {
  const byMember = (splits: { memberId: string; amountCents: number }[]) =>
    Object.fromEntries(splits.map((s) => [s.memberId, s.amountCents]));

  it("in parti uguali divide il nuovo totale fra gli stessi partecipanti", () => {
    const splits = resplitTotal(9000, "EQUAL", [
      { memberId: "a", amountCents: 1000 },
      { memberId: "b", amountCents: 1000 },
      { memberId: "c", amountCents: 1000 },
    ]);
    expect(byMember(splits)).toEqual({ a: 3000, b: 3000, c: 3000 });
  });

  it("lascia il centesimo di resto a chi lo aveva già", () => {
    const splits = resplitTotal(1000, "EQUAL", [
      { memberId: "a", amountCents: 33 },
      { memberId: "b", amountCents: 33 },
      { memberId: "c", amountCents: 34 },
    ]);
    expect(byMember(splits)).toEqual({ a: 333, b: 333, c: 334 });
  });

  it("per quote mantiene le proporzioni di prima, non i pesi attuali", () => {
    const splits = resplitTotal(20000, "SHARES", [
      { memberId: "a", amountCents: 6000 },
      { memberId: "b", amountCents: 4000 },
    ]);
    expect(byMember(splits)).toEqual({ a: 12000, b: 8000 });
  });

  it("per quote chi aveva quota zero resta a zero", () => {
    const splits = resplitTotal(5000, "SHARES", [
      { memberId: "a", amountCents: 1000 },
      { memberId: "b", amountCents: 0 },
    ]);
    expect(byMember(splits)).toEqual({ a: 5000, b: 0 });
  });

  it("rifiuta le spese divise per importi esatti", () => {
    expect(() =>
      resplitTotal(2000, "EXACT", [
        { memberId: "a", amountCents: 700 },
        { memberId: "b", amountCents: 300 },
      ]),
    ).toThrow(SplitError);
  });

  it("rifiuta importi non validi o senza partecipanti", () => {
    const previous = [{ memberId: "a", amountCents: 100 }];
    expect(() => resplitTotal(0, "EQUAL", previous)).toThrow(SplitError);
    expect(() => resplitTotal(-100, "SHARES", previous)).toThrow(SplitError);
    expect(() => resplitTotal(1000, "EQUAL", [])).toThrow(SplitError);
  });

  it("la somma delle nuove quote è sempre il nuovo totale", () => {
    const previous = [
      { memberId: "a", amountCents: 5501 },
      { memberId: "b", amountCents: 2999 },
      { memberId: "c", amountCents: 1500 },
    ];
    for (const total of [1, 7, 999, 10000, 123457]) {
      for (const mode of ["EQUAL", "SHARES"] as const) {
        const splits = resplitTotal(total, mode, previous);
        expect(splits.reduce((sum, s) => sum + s.amountCents, 0)).toBe(total);
        expect(splits.map((s) => s.memberId).sort()).toEqual(["a", "b", "c"]);
      }
    }
  });
});
