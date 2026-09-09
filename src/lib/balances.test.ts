import { describe, expect, it } from "vitest";
import {
  computeBalances,
  computePairwiseBalances,
  simplifyDebts,
  type BalanceInputExpense,
  type MemberBalance,
} from "@/lib/balances";

const members = [
  { id: "anna", name: "Anna" },
  { id: "bruno", name: "Bruno" },
  { id: "carla", name: "Carla" },
];

function expense(payerId: string, amountCents: number): BalanceInputExpense {
  const share = amountCents / members.length;
  return {
    payerId,
    amountCents,
    splits: members.map((m) => ({ memberId: m.id, amountCents: share })),
  };
}

describe("computeBalances", () => {
  it("somma anticipi e quote a carico", () => {
    const balances = computeBalances(members, [expense("anna", 3000), expense("bruno", 600)]);

    expect(balances[0]).toMatchObject({ paidCents: 3000, owedCents: 1200, netCents: 1800 });
    expect(balances[1]).toMatchObject({ paidCents: 600, owedCents: 1200, netCents: -600 });
    expect(balances[2]).toMatchObject({ paidCents: 0, owedCents: 1200, netCents: -1200 });
  });

  it("i saldi di un gruppo sommano sempre a zero", () => {
    const balances = computeBalances(members, [expense("anna", 3001), expense("carla", 777)]);
    // Con importi non divisibili le quote restano frazionarie solo in questo
    // test: nell'app arrivano già arrotondate al centesimo da computeSplits.
    expect(balances.reduce((sum, b) => sum + b.netCents, 0)).toBeCloseTo(0, 6);
  });

  it("i rimborsi riducono il debito di chi paga", () => {
    const balances = computeBalances(
      members,
      [expense("anna", 3000)],
      [{ fromMemberId: "bruno", toMemberId: "anna", amountCents: 1000 }],
    );

    // Anna anticipa 3000 e ne ha 1000 a carico: credito di 2000.
    expect(balances[0].netCents).toBe(1000); // 2000 - 1000 ricevuti da Bruno
    expect(balances[1].netCents).toBe(0); // -1000 + 1000 versati
    expect(balances[2].netCents).toBe(-1000);
  });

  it("cambiando il pagatore i saldi si ribaltano, le quote restano", () => {
    // È quello che succede quando l'amministratore corregge chi ha pagato:
    // le quote a carico non dipendono dal pagatore, gli anticipi sì.
    const prima = computeBalances(members, [expense("anna", 3000)]);
    const dopo = computeBalances(members, [expense("bruno", 3000)]);

    expect(prima.map((b) => b.netCents)).toEqual([2000, -1000, -1000]);
    expect(dopo.map((b) => b.netCents)).toEqual([-1000, 2000, -1000]);
    expect(dopo.map((b) => b.owedCents)).toEqual(prima.map((b) => b.owedCents));
    expect(dopo.reduce((sum, b) => sum + b.netCents, 0)).toBe(0);
  });

  it("ignora membri esterni al gruppo", () => {
    const balances = computeBalances(members, [
      { payerId: "sconosciuto", amountCents: 500, splits: [{ memberId: "anna", amountCents: 500 }] },
    ]);
    expect(balances.map((b) => b.netCents)).toEqual([-500, 0, 0]);
  });
});

describe("simplifyDebts", () => {
  function balancesFrom(nets: Record<string, number>): MemberBalance[] {
    return Object.entries(nets).map(([memberId, netCents]) => ({
      memberId,
      name: memberId,
      paidCents: 0,
      owedCents: 0,
      settledOutCents: 0,
      settledInCents: 0,
      netCents,
    }));
  }

  it("azzera i saldi con i pagamenti proposti", () => {
    const balances = balancesFrom({ anna: 1800, bruno: -600, carla: -1200 });
    const debts = simplifyDebts(balances);

    expect(debts).toEqual([
      { fromMemberId: "carla", fromName: "carla", toMemberId: "anna", toName: "anna", amountCents: 1200 },
      { fromMemberId: "bruno", fromName: "bruno", toMemberId: "anna", toName: "anna", amountCents: 600 },
    ]);
  });

  it("usa al massimo n-1 pagamenti", () => {
    const nets = { a: 500, b: 300, c: -200, d: -600, e: 0 };
    const debts = simplifyDebts(balancesFrom(nets));

    expect(debts.length).toBeLessThanOrEqual(Object.keys(nets).length - 1);

    const settled: Record<string, number> = { a: 0, b: 0, c: 0, d: 0, e: 0 };
    for (const debt of debts) {
      settled[debt.fromMemberId] -= debt.amountCents;
      settled[debt.toMemberId] += debt.amountCents;
    }
    for (const [id, net] of Object.entries(nets)) {
      expect(settled[id]).toBe(net);
    }
  });

  it("non propone pagamenti quando i conti sono in pari", () => {
    expect(simplifyDebts(balancesFrom({ anna: 0, bruno: 0 }))).toEqual([]);
    expect(simplifyDebts([])).toEqual([]);
  });

  it("gestisce un debitore che paga più creditori", () => {
    const debts = simplifyDebts(balancesFrom({ anna: -1000, bruno: 600, carla: 400 }));
    expect(debts).toHaveLength(2);
    expect(debts.every((d) => d.fromMemberId === "anna")).toBe(true);
    expect(debts.reduce((sum, d) => sum + d.amountCents, 0)).toBe(1000);
  });
});

describe("computePairwiseBalances", () => {
  /** Il saldo verso una persona, cercato per nome fra i risultati. */
  function verso(balances: ReturnType<typeof computePairwiseBalances>, memberId: string) {
    return balances.find((b) => b.memberId === memberId)?.netCents;
  }

  it("chi anticipa diventa creditore della quota di ognuno", () => {
    const balances = computePairwiseBalances("anna", members, [expense("anna", 3000)]);

    // Anna non compare fra i propri saldi: verso se stessa non deve niente.
    expect(balances.map((b) => b.memberId)).toEqual(["bruno", "carla"]);
    expect(verso(balances, "bruno")).toBe(1000);
    expect(verso(balances, "carla")).toBe(1000);
  });

  it("chi non anticipa deve al pagatore la sola propria quota", () => {
    const balances = computePairwiseBalances("bruno", members, [expense("anna", 3000)]);

    expect(verso(balances, "anna")).toBe(-1000);
    // Con Carla non c'è stato niente: il debito è verso chi ha pagato, non
    // verso gli altri partecipanti alla spesa.
    expect(verso(balances, "carla")).toBe(0);
  });

  it("il saldo fra due persone è lo stesso visto dai due lati, col segno opposto", () => {
    const expenses = [expense("anna", 3000), expense("bruno", 900)];
    const settlements = [{ fromMemberId: "carla", toMemberId: "anna", amountCents: 400 }];

    const daAnna = computePairwiseBalances("anna", members, expenses, settlements);
    const daBruno = computePairwiseBalances("bruno", members, expenses, settlements);

    expect(verso(daAnna, "bruno")).toBe(-verso(daBruno, "anna")!);
  });

  it("la somma dei saldi verso gli altri è il saldo del membro nel gruppo", () => {
    // È l'invariante che tiene insieme il totale del riepilogo e l'elenco per
    // persona che gli sta sotto: se saltasse, i due numeri racconterebbero
    // storie diverse.
    const expenses = [expense("anna", 3000), expense("bruno", 900), expense("carla", 600)];
    const settlements = [
      { fromMemberId: "bruno", toMemberId: "anna", amountCents: 500 },
      { fromMemberId: "carla", toMemberId: "bruno", amountCents: 250 },
    ];

    const balances = computeBalances(members, expenses, settlements);

    for (const member of members) {
      const pairwise = computePairwiseBalances(member.id, members, expenses, settlements);
      const somma = pairwise.reduce((sum, b) => sum + b.netCents, 0);
      expect(somma).toBe(balances.find((b) => b.memberId === member.id)!.netCents);
    }
  });

  it("un rimborso riduce il debito verso chi lo riceve", () => {
    const expenses = [expense("anna", 3000)];

    expect(verso(computePairwiseBalances("bruno", members, expenses), "anna")).toBe(-1000);
    expect(
      verso(
        computePairwiseBalances("bruno", members, expenses, [
          { fromMemberId: "bruno", toMemberId: "anna", amountCents: 1000 },
        ]),
        "anna",
      ),
    ).toBe(0);
  });

  it("ignora i membri che non appartengono al gruppo", () => {
    // Una spesa di un gruppo diverso non deve entrare nei conti di questo.
    const balances = computePairwiseBalances("anna", members, [
      {
        payerId: "dario",
        amountCents: 1000,
        splits: [{ memberId: "anna", amountCents: 1000 }],
      },
    ]);

    expect(balances.every((b) => b.netCents === 0)).toBe(true);
  });
});
