"use client";

import { House, Plus, ReceiptText, Scale, Users, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { SegmentedLinks } from "@/components/ui";

const tabs: { segment: string; label: string; Icon: LucideIcon }[] = [
  { segment: "", label: "Riepilogo", Icon: House },
  { segment: "/spese", label: "Spese", Icon: ReceiptText },
  { segment: "/saldi", label: "Saldi", Icon: Scale },
  { segment: "/membri", label: "Membri", Icon: Users },
];

/**
 * Le schede del gruppo, in due forme secondo lo schermo.
 *
 * Da tablet in su sono il controllo segmentato di iOS, sotto il nome del
 * gruppo. Su un telefono diventano la barra delle schede in basso, dove arriva
 * il pollice, con accanto il pulsante rotondo per aggiungere una spesa: è
 * l'azione più frequente, e così resta a portata da ogni scheda.
 *
 * Una scheda resta accesa anche nelle pagine sotto di lei: «Nuova spesa» è
 * ancora dentro «Spese».
 */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/gruppi/${groupId}`;
  const newExpenseHref = `${base}/spese/nuova`;

  const items = tabs.map((tab) => {
    const href = `${base}${tab.segment}`;
    const active = tab.segment ? pathname.startsWith(href) : pathname === href;
    return { ...tab, href, active };
  });

  return (
    <>
      <nav aria-label="Sezioni del gruppo" className="hidden sm:block">
        <SegmentedLinks className="max-w-2xl" items={items} />
      </nav>

      {/* `data-tab-bar` lo cerca `globals.css`, che sotto la barra lascia
          spazio in fondo alla pagina: l'ultima riga non finisce mai coperta. */}
      <div
        data-tab-bar
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-3 sm:hidden"
      >
        <nav
          aria-label="Sezioni del gruppo"
          className="flex h-16 flex-1 items-center justify-around rounded-full bg-surface/90 px-1.5 shadow-[0_6px_24px_rgb(0_0_0/0.14)] ring-1 ring-separator backdrop-blur-xl"
        >
          {items.map(({ href, label, Icon, active }) => (
            <NavLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-16 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] transition ${
                active ? "bg-tint/12 font-semibold text-tint" : "font-medium text-label-secondary"
              }`}
            >
              <Icon aria-hidden strokeWidth={2} className="size-[22px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Dentro «Nuova spesa» porterebbe dove si è già: lì si toglie. */}
        {pathname !== newExpenseHref && (
          <NavLink
            href={newExpenseHref}
            aria-label="Aggiungi una spesa"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-tint text-white shadow-[0_6px_20px_rgb(0_0_0/0.2)] transition active:scale-95 motion-reduce:active:scale-100"
          >
            <Plus aria-hidden strokeWidth={2.6} className="size-7" />
          </NavLink>
        )}
      </div>
    </>
  );
}
