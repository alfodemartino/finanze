import { describe, expect, it } from "vitest";
import { allocateByWeights, centsToInput, formatCents, parseAmountToCents } from "@/lib/money";

describe("parseAmountToCents", () => {
  it("legge il formato italiano e quello inglese", () => {
    expect(parseAmountToCents("12,50")).toBe(1250);
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents(" 7 ")).toBe(700);
  });

  it("arrotonda al centesimo", () => {
    expect(parseAmountToCents("0,015")).toBe(2);
    expect(parseAmountToCents("10,004")).toBe(1000);
  });

  it("rifiuta i valori non numerici", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("10 euro")).toBeNull();
  });
});

describe("allocateByWeights", () => {
  it("non perde né crea centesimi", () => {
    const parts = allocateByWeights(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
  });

  it("rispetta le proporzioni", () => {
    expect(allocateByWeights(10000, [60, 40])).toEqual([6000, 4000]);
    expect(allocateByWeights(10001, [60, 40])).toEqual([6001, 4000]);
  });

  it("gestisce pesi nulli tornando alla parti uguali", () => {
    expect(allocateByWeights(300, [0, 0, 0])).toEqual([100, 100, 100]);
  });

  it("assegna zero ai pesi a zero quando altri hanno peso", () => {
    expect(allocateByWeights(300, [0, 1, 1])).toEqual([0, 150, 150]);
  });

  it("gestisce un solo partecipante e importi a zero", () => {
    expect(allocateByWeights(999, [5])).toEqual([999]);
    expect(allocateByWeights(0, [1, 1])).toEqual([0, 0]);
  });
});

describe("formattazione", () => {
  it("formatta in euro", () => {
    // L'italiano raggruppa le migliaia solo a partire da 5 cifre e Intl usa
    // uno spazio non separabile prima del simbolo di valuta.
    const normalize = (value: string) => value.replace(/\s/g, " ");
    expect(normalize(formatCents(123456))).toBe("1234,56 \u20ac");
    expect(normalize(formatCents(1234567))).toBe("12.345,67 \u20ac");
    expect(normalize(formatCents(-500))).toBe("-5,00 \u20ac");
  });

  it("prepara il valore per gli input", () => {
    expect(centsToInput(1250)).toBe("12.50");
  });
});
