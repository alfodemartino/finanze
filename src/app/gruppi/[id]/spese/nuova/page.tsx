import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, listCategoryKeywords, listExpenses } from "@/lib/groups";
import { buildCategoryHistory, buildDictionary } from "@/lib/categories";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { Card } from "@/components/ui";

/**
 * Il form della nuova spesa, in una pagina tutta sua: ci si arriva dal «+»
 * della barra in basso o da «Aggiungi una spesa». Dopo il salvataggio si resta
 * qui, con il form vuoto: chi rientra dalla spesa ha spesso più scontrini da
 * registrare di fila.
 */
export default async function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const [expenses, keywordOverrides] = await Promise.all([
    listExpenses(group.id),
    listCategoryKeywords(group.id),
  ]);

  // Lo storico insegna al form come il gruppo categorizza le sue spese.
  const categoryHistory = buildCategoryHistory(expenses, buildDictionary(keywordOverrides));

  return (
    <Card title="Nuova spesa" className="max-w-2xl">
      <ExpenseForm
        groupId={group.id}
        currency={group.currency}
        members={group.members
          .filter((member) => member.active)
          .map((member) => ({
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
  );
}
