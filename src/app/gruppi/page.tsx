import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listGroupsForUser } from "@/lib/groups";
import { CreateGroupForm, JoinGroupForm } from "@/components/forms/GroupForms";
import { Card, EmptyState } from "@/components/ui";

export const metadata = { title: "I miei gruppi — Finanze" };

export default async function GroupsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const groups = await listGroupsForUser(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">I miei gruppi</h1>

      <Card title="Gruppi a cui partecipi">
        {groups.length === 0 ? (
          <EmptyState>
            Non fai ancora parte di nessun gruppo. Creane uno qui sotto oppure entra con un codice
            di invito.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {groups.map(({ group, role }) => (
              <li key={group.id}>
                <Link
                  href={`/gruppi/${group.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>
                    <span className="font-medium">{group.name}</span>
                    {role === "OWNER" && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                        amministratore
                      </span>
                    )}
                    <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                      {group._count.members} membri · {group._count.expenses} spese
                    </span>
                  </span>
                  <span aria-hidden className="text-slate-400">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Crea un nuovo gruppo" description="Diventi automaticamente amministratore.">
          <CreateGroupForm />
        </Card>
        <Card title="Entra in un gruppo esistente" description="Serve il codice di invito.">
          <JoinGroupForm />
        </Card>
      </div>
    </div>
  );
}
