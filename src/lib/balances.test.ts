import { describe, expect, it } from "vitest";
import {
  computeBalances,
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
