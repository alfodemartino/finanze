import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupBalances, getGroupForUser, listExpenses } from "@/lib/groups";
import { BalanceTable, DebtList } from "@/components/Balances";
import { ExpenseList } from "@/components/ExpenseList";
import { ButtonLink, Card } from "@/components/ui";

export default async function GroupOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const [{ balances, debts }, expenses] = await Promise.all([
    getGroupBalances(group.id),
    listExpenses(group.id, 5),
  ]);

  return (
    <div className="space-y-6">
      <Card
        title="Chi deve dare quanto a chi"
        description="Il numero minimo di pagamenti per pareggiare i conti di tutti."
        actions={
          <ButtonLink href={`/gruppi/${group.id}/saldi`} variant="secondary" size="sm">
            Registra un rimborso
          </ButtonLink>
        }
      >
        <DebtList debts={debts} currency={group.currency} />
      </Card>

      <Card title="Saldi dei membri">
        <BalanceTable balances={balances} currency={group.currency} />
      </Card>

      <Card
        title="Ultime spese"
        flush
        actions={
          <ButtonLink href={`/gruppi/${group.id}/spese`} size="sm">
            Aggiungi una spesa
          </ButtonLink>
        }
      >
        <ExpenseList expenses={expenses} currency={group.currency} groupId={group.id} />
      </Card>
    </div>
  );
}
