import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { AddMemberForm, InviteCodeForm, MemberRow } from "@/components/forms/MemberForms";
import { DeleteGroupForm } from "@/components/forms/GroupForms";
import { Card } from "@/components/ui";

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const canManage = group.viewer.role === "OWNER";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Membri del gruppo" flush>
        <ul className="divide-y divide-separator">
          {group.members.map((member) => (
            <MemberRow
              key={member.id}
              groupId={group.id}
              canManage={canManage}
              member={{
                id: member.id,
                name: member.name,
                shareWeight: member.shareWeight,
                role: member.role,
                active: member.active,
                hasAccount: member.userId !== null,
              }}
            />
          ))}
        </ul>
      </Card>

      {/* `self-start`: le card portano `h-full` per pareggiarsi quando stanno
          affiancate nella griglia, ma qui sono incolonnate e si allungherebbero
          ognuna all'altezza dell'intera riga. */}
      <div className="space-y-6 self-start">
        {canManage && (
          <Card title="Aggiungi un membro">
            <AddMemberForm groupId={group.id} />
          </Card>
        )}

        <Card
          title="Codice di invito"
          description="Chi ha un account può usarlo per entrare nel gruppo da solo."
        >
          <p className="rounded-control bg-fill px-4 py-3 text-center text-xl font-semibold tracking-[0.3em] tabular-nums">
            {group.inviteCode}
          </p>
          {canManage && (
            <div className="mt-3">
              <InviteCodeForm groupId={group.id} />
            </div>
          )}
        </Card>

        {canManage && (
          <Card
            title="Elimina il gruppo"
            description="Sparisce tutto: spese, rimborsi, membri e saldi. Non si torna indietro."
          >
            <DeleteGroupForm groupId={group.id} groupName={group.name} />
          </Card>
        )}
      </div>
    </div>
  );
}
