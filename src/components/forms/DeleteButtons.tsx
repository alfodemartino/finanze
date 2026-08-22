"use client";

import { useActionState } from "react";
import { deleteExpenseAction, deleteSettlementAction } from "@/app/actions/expenses";
import { emptyActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/SubmitButton";

export function DeleteExpenseButton({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const [state, formAction] = useActionState(deleteExpenseAction, emptyActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Eliminare questa spesa? I saldi verranno ricalcolati.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="expenseId" value={expenseId} />
      <SubmitButton variant="danger" className="px-2 py-1 text-xs" pendingLabel="Elimino…">
        Elimina
      </SubmitButton>
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function DeleteSettlementButton({
  groupId,
  settlementId,
}: {
  groupId: string;
  settlementId: string;
}) {
  const [state, formAction] = useActionState(deleteSettlementAction, emptyActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Eliminare questo rimborso?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="settlementId" value={settlementId} />
      <SubmitButton variant="danger" className="px-2 py-1 text-xs" pendingLabel="Elimino…">
        Elimina
      </SubmitButton>
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
