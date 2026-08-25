"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/NavLink";

const tabs = [
  { segment: "", label: "Riepilogo" },
  { segment: "/spese", label: "Spese" },
  { segment: "/saldi", label: "Saldi" },
  { segment: "/membri", label: "Membri" },
];

/**
 * Il controllo segmentato di iOS: una pista grigia con dentro una pastiglia
 * chiara che indica dove sei. Le voci restano link, come prima.
 */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/gruppi/${groupId}`;

  return (
    <nav className="scroll-x">
      <ul className="flex min-w-max gap-0.5 rounded-control bg-fill p-0.5 sm:min-w-0 sm:max-w-2xl">
        {tabs.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = pathname === href;
          return (
            <li key={tab.label} className="flex-1">
              <NavLink
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-[7px] px-4 py-1.5 text-center text-[13px] font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-raised text-label shadow-sm"
                    : "text-label-secondary hover:text-label"
                }`}
              >
                {tab.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
