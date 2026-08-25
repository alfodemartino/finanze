import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { GroupTabs } from "@/components/GroupTabs";
import { buttonClass } from "@/components/ui";

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

        {/* L'export è riservato all'amministratore, come il controllo lato
            server: chi non lo è non vede nemmeno il pulsante. È un <a> e non
            un <Link> perché il browser deve scaricare un file, non navigare. */}
        {group.viewer.role === "OWNER" && (
          <a href={`/gruppi/${group.id}/export`} className={buttonClass("secondary")}>
            Esporta in Excel
          </a>
        )}
      </div>

      <GroupTabs groupId={group.id} />

      {children}
    </div>
  );
}
