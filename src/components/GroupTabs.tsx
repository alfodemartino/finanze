"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { segment: "", label: "Riepilogo" },
  { segment: "/spese", label: "Spese" },
  { segment: "/saldi", label: "Saldi" },
  { segment: "/membri", label: "Membri" },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/gruppi/${groupId}`;

  return (
    <nav className="scroll-x">
      <ul className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = pathname === href;
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
