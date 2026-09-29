import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCategoryTotals, getGroupBalances, getGroupForUser, listExpenses } from "@/lib/groups";
import { categoryBreakdown } from "@/lib/category-totals";
import { parsePeriod } from "@/lib/periods";
import { BalanceTable, DebtList } from "@/components/Balances";
import { CategoryTotals } from "@/components/CategoryTotals";
import { ExpenseList } from "@/components/ExpenseList";
import { ButtonLink, Card } from "@/components/ui";

export default async function GroupOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string | string[] }>;
}) {
  const { id } = await params;
  const { periodo } = await searchParams;
  // Un parametro ripetuto arriva come elenco: vale il primo.
  const period = parsePeriod(Array.isArray(periodo) ? periodo[0] : periodo);
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const [{ balances, debts }, expenses, categoryTotals] = await Promise.all([
    getGroupBalances(group.id),
    listExpenses(group.id, 5),
    getCategoryTotals(group.id, period.start, period.end),
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
        title="Spese per categoria"
        description="Quanto ha speso il gruppo, rimborsi esclusi."
        flush
      >
        <CategoryTotals
          groupId={group.id}
          currency={group.currency}
          period={period}
          breakdown={categoryBreakdown(categoryTotals)}
        />
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
