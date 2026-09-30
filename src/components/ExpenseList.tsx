import { formatCents } from "@/lib/money";
import { categoryLabel, type ExpenseCategory } from "@/lib/categories";
import { EmptyState } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategorySelect } from "@/components/forms/CategoryForms";
import { ExpenseSearchResult } from "@/components/ExpenseSearch";
import { DeleteExpenseButton } from "@/components/forms/DeleteButtons";
import { PayerSelect, type PayerOption } from "@/components/forms/PayerSelect";

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
  category: ExpenseCategory | null;
  payer: { id: string; name: string };
  splits: { memberId: string; amountCents: number; member: { id: string; name: string } }[];
};

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

export function ExpenseList({
  expenses,
  currency,
  groupId,
  editable = false,
  payerOptions,
}: {
  expenses: ExpenseListItem[];
  currency: string;
  groupId: string;
  /** Righe che ogni membro può correggere: categoria ed eliminazione. */
  editable?: boolean;
  /** Membri fra cui scegliere il pagatore: solo per chi può modificarlo. */
  payerOptions?: PayerOption[];
}) {
  if (expenses.length === 0) {
    return <EmptyState>Nessuna spesa registrata finora.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-separator">
      {expenses.map((expense) => (
        <ExpenseSearchResult key={expense.id} id={expense.id}>
          <li className="flex items-start gap-3 px-4 py-3">
            <CategoryIcon category={expense.category} className="mt-0.5" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[17px] font-medium">{expense.description}</span>
                <span className="text-[17px] font-semibold tabular-nums">
                  {formatCents(expense.amountCents, currency)}
                </span>
              </div>

              <p className="mt-0.5 text-[13px] text-label-secondary">
                {editable ? (
                  <CategorySelect
                    groupId={groupId}
                    expenseId={expense.id}
                    category={expense.category}
                  />
                ) : (
                  <span className="font-medium text-label">{categoryLabel(expense.category)}</span>
                )}{" "}
                · {dateFormat.format(expense.date)} · ha pagato{" "}
                {payerOptions?.length ? (
                  <PayerSelect
                    groupId={groupId}
                    expenseId={expense.id}
                    payerId={expense.payer.id}
                    // Un membro disattivato non compare più fra le scelte, ma se ha
                    // pagato lui la tendina deve comunque poterlo mostrare.
                    members={
                      payerOptions.some((option) => option.id === expense.payer.id)
                        ? payerOptions
                        : [expense.payer, ...payerOptions]
                    }
                  />
                ) : (
                  <span className="font-medium text-label">{expense.payer.name}</span>
                )}{" "}
                · {splitModeLabels[expense.splitMode] ?? expense.splitMode}
              </p>

              <p className="mt-1 text-[13px] text-label-secondary">
                {expense.splits
                  .map((split) => `${split.member.name} ${formatCents(split.amountCents, currency)}`)
                  .join(" · ")}
              </p>

              {expense.note && (
                <p className="mt-1 text-[13px] text-label-tertiary italic">{expense.note}</p>
              )}

              {editable && (
                <div className="mt-2">
                  <DeleteExpenseButton groupId={groupId} expenseId={expense.id} />
                </div>
              )}
            </div>
          </li>
        </ExpenseSearchResult>
      ))}
    </ul>
  );
}
