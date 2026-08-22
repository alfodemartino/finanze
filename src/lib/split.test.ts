import { describe, expect, it } from "vitest";
import { computeSplits, SplitError } from "@/lib/split";

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
