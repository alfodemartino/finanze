import { describe, expect, it } from "vitest";
import { buildOverview, type OverviewGroupInput } from "@/lib/overview";

/**
 * Un gruppo con tre membri: chi guarda («io»), una persona con un account e
 * una senza. Le spese si passano già ripartite, come arrivano dal database.
 */
function gruppo(overrides: Partial<OverviewGroupInput> = {}): OverviewGroupInput {
  return {
    id: "casa",
    name: "Casa",
    currency: "EUR",
    viewerMemberId: "io-casa",
    members: [
      { id: "io-casa", name: "Anna", userId: "u-anna" },
      { id: "bruno-casa", name: "Bruno", userId: "u-bruno" },
      { id: "figlio-casa", name: "Marco", userId: null },
    ],
    expenses: [],
    settlements: [],
    ...overrides,
  };
}

/** Una spesa pagata da `payerId` e divisa in parti uguali fra i partecipanti. */
function spesa(payerId: string, amountCents: number, partecipanti: string[]) {
  const quota = amountCents / partecipanti.length;
  return {
    payerId,
    amountCents,
    splits: partecipanti.map((memberId) => ({ memberId, amountCents: quota })),
  };
}

describe("buildOverview", () => {
  it("somma il saldo verso la stessa persona su più gruppi", () => {
    const overview = buildOverview([
      gruppo({
        expenses: [spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"])],
      }),
      gruppo({
        id: "vacanze",
        name: "Vacanze",
        viewerMemberId: "io-vacanze",
        members: [
          { id: "io-vacanze", name: "Anna", userId: "u-anna" },
          // Bruno ha lo stesso account: è la stessa persona, anche se qui il
          // suo `Member` è un altro.
          { id: "bruno-vacanze", name: "Bruno", userId: "u-bruno" },
        ],
        expenses: [spesa("io-vacanze", 500, ["io-vacanze", "bruno-vacanze"])],
      }),
    ]);

    expect(overview).toHaveLength(1);
    const bruno = overview[0].people.find((p) => p.key === "user:u-bruno")!;
    expect(bruno.netCents).toBe(1250); // 1000 da Casa + 250 da Vacanze
    expect(bruno.groups.map((g) => g.name)).toEqual(["Casa", "Vacanze"]);
  });

  it("tiene distinti i membri senza account, anche con lo stesso nome", () => {
    // Due «Marco» senza account in due gruppi diversi possono benissimo essere
    // due persone: accorparli per nome sommerebbe conti che non c'entrano.
    const overview = buildOverview([
      gruppo({ expenses: [spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"])] }),
      gruppo({
        id: "padel",
        name: "Padel",
        viewerMemberId: "io-padel",
        members: [
          { id: "io-padel", name: "Anna", userId: "u-anna" },
          { id: "marco-padel", name: "Marco", userId: null },
        ],
        expenses: [spesa("io-padel", 800, ["io-padel", "marco-padel"])],
      }),
    ]);

    const marchi = overview[0].people.filter((p) => p.name === "Marco");
    expect(marchi).toHaveLength(2);
    expect(marchi.map((p) => p.key).sort()).toEqual(["member:figlio-casa", "member:marco-padel"]);
  });

  it("non somma valute diverse: un blocco per ognuna", () => {
    const overview = buildOverview([
      gruppo({ expenses: [spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"])] }),
      gruppo({
        id: "londra",
        name: "Londra",
        currency: "GBP",
        viewerMemberId: "io-londra",
        members: [
          { id: "io-londra", name: "Anna", userId: "u-anna" },
          { id: "bruno-londra", name: "Bruno", userId: "u-bruno" },
        ],
        expenses: [spesa("bruno-londra", 400, ["io-londra", "bruno-londra"])],
      }),
    ]);

    expect(overview.map((blocco) => blocco.currency)).toEqual(["EUR", "GBP"]);
    expect(overview[0].netCents).toBe(2000);
    expect(overview[1].netCents).toBe(-200);
  });

  it("il totale è sempre la somma delle persone elencate", () => {
    const overview = buildOverview([
      gruppo({
        expenses: [
          spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"]),
          spesa("bruno-casa", 900, ["io-casa", "bruno-casa", "figlio-casa"]),
        ],
        settlements: [{ fromMemberId: "figlio-casa", toMemberId: "io-casa", amountCents: 400 }],
      }),
    ]);

    const blocco = overview[0];
    const somma = blocco.people.reduce((sum, person) => sum + person.netCents, 0);
    expect(blocco.netCents).toBe(somma);
    expect(blocco.toReceiveCents - blocco.toPayCents).toBe(blocco.netCents);
  });

  it("non elenca chi è in pari, né i gruppi in cui non c'è niente in sospeso", () => {
    const overview = buildOverview([
      gruppo({
        expenses: [spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"])],
        // Bruno ha già saldato: resta solo il figlio.
        settlements: [{ fromMemberId: "bruno-casa", toMemberId: "io-casa", amountCents: 1000 }],
      }),
      gruppo({
        id: "vacanze",
        name: "Vacanze",
        viewerMemberId: "io-vacanze",
        members: [
          { id: "io-vacanze", name: "Anna", userId: "u-anna" },
          { id: "bruno-vacanze", name: "Bruno", userId: "u-bruno" },
        ],
        // Nessuna spesa: il gruppo non deve comparire da nessuna parte.
      }),
    ]);

    expect(overview[0].people.map((p) => p.name)).toEqual(["Marco"]);
    expect(overview[0].groupCount).toBe(1);
  });

  it("un credito e un debito pari verso la stessa persona si annullano", () => {
    const overview = buildOverview([
      gruppo({ expenses: [spesa("io-casa", 2000, ["io-casa", "bruno-casa"])] }),
      gruppo({
        id: "vacanze",
        name: "Vacanze",
        viewerMemberId: "io-vacanze",
        members: [
          { id: "io-vacanze", name: "Anna", userId: "u-anna" },
          { id: "bruno-vacanze", name: "Bruno", userId: "u-bruno" },
        ],
        expenses: [spesa("bruno-vacanze", 2000, ["io-vacanze", "bruno-vacanze"])],
      }),
    ]);

    // Con Bruno i conti tornano: non resta niente da mostrare, quindi nemmeno
    // il blocco della valuta.
    expect(overview).toEqual([]);
  });

  it("ordina le persone dall'importo più grande, in valore assoluto", () => {
    const overview = buildOverview([
      gruppo({
        expenses: [
          spesa("io-casa", 3000, ["io-casa", "bruno-casa", "figlio-casa"]),
          spesa("bruno-casa", 6000, ["io-casa", "bruno-casa"]),
        ],
      }),
    ]);

    // Verso Bruno: +1000 - 3000 = -2000. Verso Marco: +1000.
    expect(overview[0].people.map((p) => [p.name, p.netCents])).toEqual([
      ["Bruno", -2000],
      ["Marco", 1000],
    ]);
    expect(overview[0].toReceiveCents).toBe(1000);
    expect(overview[0].toPayCents).toBe(2000);
    expect(overview[0].netCents).toBe(-1000);
  });

  it("senza gruppi non c'è niente da riepilogare", () => {
    expect(buildOverview([])).toEqual([]);
  });
});
