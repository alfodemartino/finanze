"use client";

import { usePathname } from "next/navigation";
import { SegmentedLinks } from "@/components/ui";

const tabs = [
  { segment: "", label: "Riepilogo" },
  { segment: "/spese", label: "Spese" },
  { segment: "/saldi", label: "Saldi" },
  { segment: "/membri", label: "Membri" },
];

/** Le schede del gruppo, nel controllo segmentato di iOS. */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/gruppi/${groupId}`;

  return (
    <nav className="scroll-x">
      <SegmentedLinks
        className="min-w-max sm:min-w-0 sm:max-w-2xl"
        items={tabs.map((tab) => {
          const href = `${base}${tab.segment}`;
          return { href, label: tab.label, active: pathname === href };
        })}
      />
    </nav>
  );
}
