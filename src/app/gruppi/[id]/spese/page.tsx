import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, listCategoryKeywords, listExpenses } from "@/lib/groups";
import { expenseSearchText } from "@/lib/search";
import { buildCategoryHistory, buildDictionary, planCategorization } from "@/lib/categories";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import {
  ExpenseSearch,
  ExpenseSearchEmpty,
  ExpenseSearchField,
  ExpenseSearchSummary,
} from "@/components/ExpenseSearch";
import { CategorizeBanner } from "@/components/forms/CategoryForms";
import { Card } from "@/components/ui";

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const activeMembers = group.members.filter((member) => member.active);
  const [expenses, keywordOverrides] = await Promise.all([
    listExpenses(group.id),
    listCategoryKeywords(group.id),
  ]);

  // Lo storico sono già tutte qui, dalla più recente: bastano a insegnare al
  // form come il gruppo categorizza, e a contare le spese senza categoria che
  // il pulsante «Categorizza» saprebbe sistemare. Nessuna query in più, a
  // parte le correzioni del gruppo al dizionario delle parole chiave.
  const dictionary = buildDictionary(keywordOverrides);
  const categoryHistory = buildCategoryHistory(expenses, dictionary);
  const uncategorized = expenses.filter((expense) => !expense.category).length;
  const recognizable = planCategorization(expenses, categoryHistory, dictionary).reduce(
    (sum, entry) => sum + entry.expenseIds.length,
    0,
  );

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
          categoryHistory={categoryHistory}
          keywordOverrides={keywordOverrides}
        />
      </Card>

      <ExpenseSearch
        items={expenses.map((expense) => ({
          id: expense.id,
          text: expenseSearchText(expense, group.currency),
        }))}
      >
        <Card title="Storico spese" description={<ExpenseSearchSummary />} flush>
          {recognizable > 0 && (
            <CategorizeBanner
              groupId={group.id}
              uncategorized={uncategorized}
              recognizable={recognizable}
            />
          )}
          {expenses.length > 0 && <ExpenseSearchField />}
          <ExpenseList
            expenses={expenses}
            currency={group.currency}
            groupId={group.id}
            editable
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
