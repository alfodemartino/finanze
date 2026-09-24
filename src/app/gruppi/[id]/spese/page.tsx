import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, listExpenses } from "@/lib/groups";
import { expenseSearchText } from "@/lib/search";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import {
  ExpenseSearch,
  ExpenseSearchEmpty,
  ExpenseSearchField,
  ExpenseSearchSummary,
} from "@/components/ExpenseSearch";
import { Card } from "@/components/ui";

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const activeMembers = group.members.filter((member) => member.active);
  const expenses = await listExpenses(group.id);

  // Solo l'amministratore può correggere il pagatore di una spesa già salvata.
  const canManage = group.viewer.role === "OWNER";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Nuova spesa">
        <ExpenseForm
          groupId={group.id}
          currency={group.currency}
          members={activeMembers.map((member) => ({
            id: member.id,
            name: member.name,
            shareWeight: member.shareWeight,
            defaultSelected: member.defaultSelected,
          }))}
          defaultPayerId={group.viewer.id}
        />
      </Card>

      <ExpenseSearch
        items={expenses.map((expense) => ({
          id: expense.id,
          text: expenseSearchText(expense, group.currency),
        }))}
      >
        <Card title="Storico spese" description={<ExpenseSearchSummary />} flush>
          {expenses.length > 0 && <ExpenseSearchField />}
          <ExpenseList
            expenses={expenses}
            currency={group.currency}
            groupId={group.id}
            deletable
            payerOptions={
              canManage
                ? activeMembers.map((member) => ({ id: member.id, name: member.name }))
                : undefined
            }
          />
          <ExpenseSearchEmpty />
        </Card>
      </ExpenseSearch>
    </div>
  );
}
