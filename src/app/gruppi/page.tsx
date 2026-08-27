import { redirect } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { currentUser } from "@/lib/auth";
import { listGroupsForUser } from "@/lib/groups";
import { formatCents } from "@/lib/money";
import { CreateGroupForm, JoinGroupForm } from "@/components/forms/GroupForms";
import { Card, Chevron, EmptyState } from "@/components/ui";

export const metadata = { title: "I miei gruppi — Finanze" };

export default async function GroupsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const groups = await listGroupsForUser(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">I miei gruppi</h1>

      <Card title="Gruppi a cui partecipi" flush>
        {groups.length === 0 ? (
          <EmptyState>
            Non fai ancora parte di nessun gruppo. Creane uno qui sotto oppure entra con un codice
            di invito.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-separator">
            {groups.map(({ group, role, totalCents }) => (
              <li key={group.id}>
                {/* Una riga di elenco iOS: si illumina alla pressione e finisce con il «›». */}
                <NavLink
                  href={`/gruppi/${group.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition active:bg-fill"
                >
                  <span>
                    <span className="text-[17px] font-medium">{group.name}</span>
                    {role === "OWNER" && (
                      <span className="ml-2 rounded-full bg-tint/10 px-2 py-0.5 text-[11px] font-semibold text-tint">
                        amministratore
                      </span>
                    )}
                    {/* Il totale non è un saldo: niente verde o rosso, solo il
                        grigio del sottotitolo. */}
                    <span className="mt-0.5 block text-[13px] text-label-secondary">
                      {group._count.members} membri · {group._count.expenses} spese ·{" "}
                      <span className="tabular-nums">
                        {formatCents(totalCents, group.currency)}
                      </span>
                    </span>
                  </span>
                  <Chevron />
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
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
