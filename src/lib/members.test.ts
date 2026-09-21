import { describe, expect, it } from "vitest";
import { defaultParticipantIds } from "@/lib/members";

describe("defaultParticipantIds", () => {
  it("tiene solo i membri selezionati di default, nell'ordine ricevuto", () => {
    expect(
      defaultParticipantIds([
        { id: "a", defaultSelected: true },
        { id: "b", defaultSelected: false },
        { id: "c", defaultSelected: true },
      ]),
    ).toEqual(["a", "c"]);
  });

  it("non spunta nessuno se l'amministratore li ha esclusi tutti", () => {
    expect(
      defaultParticipantIds([
        { id: "a", defaultSelected: false },
        { id: "b", defaultSelected: false },
      ]),
    ).toEqual([]);
  });

  it("regge un gruppo senza membri", () => {
    expect(defaultParticipantIds([])).toEqual([]);
  });
});
