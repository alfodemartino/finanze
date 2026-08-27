import { notFound, redirect } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { currentUser } from "@/lib/auth";
import { getGroupExpenseTotal, getGroupForUser } from "@/lib/groups";
import { formatCents } from "@/lib/money";
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

  // Solo dopo il controllo di appartenenza: chi non è del gruppo non arriva
  // nemmeno a interrogare le sue spese.
  const totalCents = await getGroupExpenseTotal(group.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* Il ritorno indietro di iOS: la freccetta e il nome di dov'eri. */}
          <NavLink
            href="/gruppi"
            className="inline-flex items-center gap-1 text-[15px] text-tint hover:underline"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Tutti i gruppi
          </NavLink>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{group.name}</h1>
          {/* La valuta non si dichiara più a parole: la porta il totale. */}
          <p className="text-[13px] text-label-secondary">
            {group.members.filter((m) => m.active).length} membri ·{" "}
            <span className="tabular-nums">{formatCents(totalCents, group.currency)}</span> di spese
          </p>
        </div>

        {/* L'export è riservato all'amministratore, come il controllo lato
            server: chi non lo è non vede nemmeno il pulsante. È un <a> e non
            un <NavLink> perché il browser deve scaricare un file, non navigare. */}
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
