import { formatCents } from "@/lib/money";
import { EmptyState } from "@/components/ui";
import { DeleteExpenseButton } from "@/components/forms/DeleteButtons";

const splitModeLabels: Record<string, string> = {
  EQUAL: "parti uguali",
  SHARES: "per quote",
  EXACT: "importi esatti",
};

export type ExpenseListItem = {
  id: string;
  description: string;
  amountCents: number;
  date: Date;
  splitMode: string;
  note: string | null;
  payer: { id: string; name: string };
  splits: { memberId: string; amountCents: number; member: { id: string; name: string } }[];
};

export function ExpenseList({
  expenses,
  currency,
  groupId,
  deletable = false,
}: {
  expenses: ExpenseListItem[];
  currency: string;
  groupId: string;
  deletable?: boolean;
}) {
  if (expenses.length === 0) {
    return <EmptyState>Nessuna spesa registrata. Aggiungi la prima qui accanto.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {expenses.map((expense) => (
        <li key={expense.id} className="py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{expense.description}</span>
            <span className="font-semibold tabular-nums">
              {formatCents(expense.amountCents, currency)}
            </span>
          </div>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(expense.date)} · ha
            pagato <span className="font-medium">{expense.payer.name}</span> ·{" "}
            {splitModeLabels[expense.splitMode] ?? expense.splitMode}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {expense.splits
              .map((split) => `${split.member.name} ${formatCents(split.amountCents, currency)}`)
              .join(" · ")}
          </p>

          {expense.note && (
            <p className="mt-1 text-sm text-slate-400 italic">{expense.note}</p>
          )}

          {deletable && (
            <div className="mt-2">
              <DeleteExpenseButton groupId={groupId} expenseId={expense.id} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
