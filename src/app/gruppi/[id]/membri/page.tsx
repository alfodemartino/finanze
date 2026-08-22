import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { AddMemberForm, InviteCodeForm, MemberRow } from "@/components/forms/MemberForms";
import { Card } from "@/components/ui";

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const canManage = group.viewer.role === "OWNER";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Membri del gruppo">
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
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

      <div className="space-y-4">
        {canManage && (
          <Card title="Aggiungi un membro">
            <AddMemberForm groupId={group.id} />
          </Card>
        )}

        <Card
          title="Codice di invito"
          description="Chi ha un account può usarlo per entrare nel gruppo da solo."
        >
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-center text-xl font-semibold tracking-[0.3em] dark:bg-slate-800">
            {group.inviteCode}
          </p>
          {canManage && (
            <div className="mt-3">
              <InviteCodeForm groupId={group.id} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
