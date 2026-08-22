import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, listExpenses } from "@/lib/groups";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { Card } from "@/components/ui";

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const activeMembers = group.members.filter((member) => member.active);
  const expenses = await listExpenses(group.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Nuova spesa">
        <ExpenseForm
          groupId={group.id}
          currency={group.currency}
          members={activeMembers.map((member) => ({
            id: member.id,
            name: member.name,
            shareWeight: member.shareWeight,
          }))}
          defaultPayerId={group.viewer.id}
        />
      </Card>

      <Card title="Storico spese" description={`${expenses.length} spese registrate.`}>
        <ExpenseList
          expenses={expenses}
          currency={group.currency}
          groupId={group.id}
          deletable
        />
      </Card>
    </div>
  );
}
