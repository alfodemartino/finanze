import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { GroupTabs } from "@/components/GroupTabs";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/gruppi" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            ← Tutti i gruppi
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {group.members.filter((m) => m.active).length} membri · valuta {group.currency}
          </p>
        </div>
      </div>

      <GroupTabs groupId={group.id} />

      {children}
    </div>
  );
}
