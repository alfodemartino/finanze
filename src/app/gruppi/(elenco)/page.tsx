import { redirect } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { currentUser } from "@/lib/auth";
import { getUserOverview, listGroupsForUser } from "@/lib/groups";
import { formatCents } from "@/lib/money";
import { CreateGroupForm, JoinGroupForm } from "@/components/forms/GroupForms";
import { Card, Chevron, EmptyState } from "@/components/ui";
import { OverviewSettled, OverviewTotals, PersonBalanceList } from "@/components/Overview";

export const metadata = { title: "I miei gruppi — Finanze" };

/*
 * La cartella `(elenco)` non compare nell'indirizzo — la pagina resta `/gruppi`
 * — ma le dà un `loading.tsx` tutto suo, distinto da quello del singolo gruppo.
 * Senza, un solo file di attesa in `gruppi/` varrebbe per entrambe le rotte e
 * chi apre un gruppo vedrebbe per un istante l'impalcatura dell'elenco.
 */

export default async function GroupsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [groups, overview] = await Promise.all([
    listGroupsForUser(user.id),
    getUserOverview(user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">I miei gruppi</h1>

      {/* Il riepilogo sta sopra l'elenco perché risponde alla prima domanda che
          ci si fa entrando: come sto messo. I gruppi sono il dettaglio.
          Un blocco per valuta: `Group.currency` è per gruppo e importi in
          valute diverse non si sommano. Con tutti i gruppi in euro — il caso
          normale — di blocchi se ne vede uno solo. */}
      {groups.length === 0 ? null : overview.length === 0 ? (
        // Chi non ha ancora gruppi non ha nemmeno conti da riepilogare: la card
        // salta del tutto, il messaggio «siamo in pari» spetta solo a chi in un
        // gruppo c'è ma non deve niente a nessuno.
        <Card title="Il tuo riepilogo" flush>
          <OverviewSettled />
        </Card>
      ) : (
        overview.map((blocco) => (
          <div key={blocco.currency} className="space-y-6">
            <Card
              title={
                overview.length > 1 ? `Il tuo riepilogo (${blocco.currency})` : "Il tuo riepilogo"
              }
              flush
            >
              <OverviewTotals overview={blocco} />
            </Card>

            <Card
              title="Saldo per persona"
              description="Quanto devi dare o ricevere da ognuno, sommando i gruppi che avete in comune."
              flush
            >
              <PersonBalanceList overview={blocco} />
            </Card>
          </div>
        ))
      )}

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
