import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupBalances, getGroupForUser, listSettlements } from "@/lib/groups";
import { BalanceTable, DebtList } from "@/components/Balances";
import { SettlementForm } from "@/components/forms/SettlementForm";
import { DeleteSettlementButton } from "@/components/forms/DeleteButtons";
import { centsToInput, formatCents } from "@/lib/money";
import { Card, EmptyState } from "@/components/ui";

export default async function BalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const [{ balances, debts }, settlements] = await Promise.all([
    getGroupBalances(group.id),
    listSettlements(group.id),
  ]);

  // Il form si apre già compilato con il primo pagamento suggerito.
  const suggestion = debts[0];
  const activeMembers = group.members
    .filter((member) => member.active)
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Pagamenti suggeriti"
          description="Ogni riga è un pagamento che avvicina il gruppo al pareggio."
        >
          <DebtList debts={debts} currency={group.currency} />
        </Card>

        <Card title="Saldi dei membri">
          <BalanceTable balances={balances} currency={group.currency} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Registra un rimborso"
          description="Quando qualcuno salda, segnalo qui: i saldi si aggiornano subito."
        >
          <SettlementForm
            groupId={group.id}
            currency={group.currency}
            members={activeMembers}
            defaultFromId={suggestion?.fromMemberId}
            defaultToId={suggestion?.toMemberId}
            defaultAmount={suggestion ? centsToInput(suggestion.amountCents) : undefined}
          />
        </Card>

        <Card title="Rimborsi registrati">
          {settlements.length === 0 ? (
            <EmptyState>Nessun rimborso registrato finora.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {settlements.map((settlement) => (
                <li key={settlement.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-sm">
                    <span className="font-medium">{settlement.from.name}</span>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="font-medium">{settlement.to.name}</span>
                    <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                      {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(settlement.date)}
                      {settlement.note ? ` · ${settlement.note}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {formatCents(settlement.amountCents, group.currency)}
                    </span>
                    <DeleteSettlementButton groupId={group.id} settlementId={settlement.id} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
