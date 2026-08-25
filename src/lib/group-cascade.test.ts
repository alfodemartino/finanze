import { describe, expect, it } from "vitest";
import {
  GROUP_CASCADE_ORDER,
  GROUP_TABLE_REFERENCES,
  type GroupTable,
} from "@/lib/group-cascade";

const tables = Object.keys(GROUP_TABLE_REFERENCES) as GroupTable[];

describe("GROUP_CASCADE_ORDER", () => {
  it("copre tutte le tabelle toccate, una volta sola", () => {
    expect([...GROUP_CASCADE_ORDER].sort()).toEqual([...tables].sort());
  });

  it("cancella chi riferisce prima di chi è riferito", () => {
    // È l'invariante che rende possibile l'eliminazione: con i vincoli
    // `RESTRICT` verso `Member` una riga non può sparire finché qualcun altro
    // la riferisce ancora.
    const position = new Map(GROUP_CASCADE_ORDER.map((table, index) => [table, index]));

    for (const table of tables) {
      for (const referenced of GROUP_TABLE_REFERENCES[table]) {
        expect(
          position.get(table),
          `${table} va svuotata prima di ${referenced}`,
        ).toBeLessThan(position.get(referenced)!);
      }
    }
  });

  it("finisce sul gruppo, l'unica riga che l'utente ha chiesto di eliminare", () => {
    expect(GROUP_CASCADE_ORDER.at(-1)).toBe("group");
  });
});
