import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getGroupForUser, listCategoryKeywords } from "@/lib/groups";
import {
  CATEGORIES,
  CATEGORY_DISPLAY_ORDER,
  describeKeywords,
  type KeywordEntry,
} from "@/lib/categories";
import { removeKeywordAction, restoreKeywordAction } from "@/app/actions/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AddKeywordForm, FormPending } from "@/components/forms/KeywordForms";
import { buttonClass, Card, Chevron } from "@/components/ui";

/*
 * Le parole chiave che propongono la categoria di una spesa, come le vede
 * questo gruppo: il dizionario di base con le correzioni del gruppo. Le vedono
 * tutti i membri, perché spiegano i suggerimenti del form; le cambia solo
 * l'amministratore, come ricontrollano le azioni.
 */

function originNote(entry: KeywordEntry) {
  if (entry.origin === "added") return "aggiunta dal gruppo";
  if (entry.origin === "moved" && entry.from) return `spostata da ${CATEGORIES[entry.from].label}`;
  return null;
}

function KeywordChip({ entry, canManage }: { entry: KeywordEntry; canManage: boolean }) {
  const note = originNote(entry);

  return (
    <li
      className={`inline-flex items-center gap-0.5 rounded-full bg-fill py-1 text-[13px] ${
        canManage ? "pr-1 pl-2.5" : "px-2.5"
      } ${note ? "font-semibold text-label" : "text-label-secondary"}`}
      title={note ?? undefined}
    >
      {entry.text}
      {note && <span className="sr-only"> ({note})</span>}
      {/* Il pulsante porta la parola come proprio valore: così basta un form
          per categoria, non uno per parola. */}
      {canManage && (
        <button
          type="submit"
          name="keyword"
          value={entry.key}
          aria-label={`Togli «${entry.text}»`}
          className="inline-flex size-6 items-center justify-center rounded-full text-label-tertiary hover:bg-fill-strong hover:text-label"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
            className="size-3"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </li>
  );
}

export default async function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const group = await getGroupForUser(id, user.id);
  if (!group) notFound();

  const canManage = group.viewer.role === "OWNER";
  const { byCategory, disabled } = describeKeywords(await listCategoryKeywords(group.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card
        title="Parole chiave"
        description="Le parole della descrizione che propongono la categoria di una nuova spesa. In grassetto quelle decise dal gruppo."
        flush
        className="lg:row-span-2"
      >
        <ul className="divide-y divide-separator">
          {CATEGORY_DISPLAY_ORDER.map((category) => {
            const entries = byCategory[category];
            return (
              <li key={category}>
                {/* Chiuse di partenza: aperte tutte sarebbero centinaia di parole. */}
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] hover:bg-fill [&::-webkit-details-marker]:hidden">
                    <CategoryIcon category={category} />
                    <span className="min-w-0 flex-1 truncate font-medium">{CATEGORIES[category].label}</span>
                    <span className="text-label-secondary tabular-nums">{entries.length}</span>
                    <Chevron className="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                  </summary>
                  {entries.length > 0 ? (
                    // Un form per categoria: ogni pulsante porta la sua parola.
                    <form action={removeKeywordAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <FormPending />
                      <ul className="flex flex-wrap gap-1.5 px-4 pb-4 sm:pl-16">
                        {entries.map((entry) => (
                          <KeywordChip key={entry.key} entry={entry} canManage={canManage} />
                        ))}
                      </ul>
                    </form>
                  ) : (
                    <p className="px-4 pb-4 text-[13px] text-label-secondary sm:pl-16">
                      Nessuna parola chiave: la categoria si sceglie a mano.
                    </p>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-6 self-start">
        {canManage ? (
          <Card
            title="Aggiungi una parola chiave"
            description="Vale solo per questo gruppo, e subito anche per il pulsante «Categorizza»."
          >
            <AddKeywordForm groupId={group.id} />
          </Card>
        ) : (
          <Card title="Chi le cambia">
            <p className="text-[15px] text-label-secondary">
              Le parole chiave del gruppo le aggiunge e le toglie l&apos;amministratore.
            </p>
          </Card>
        )}

        {disabled.length > 0 && (
          <Card
            title="Parole disattivate"
            description="Parole del dizionario di base che nel gruppo non indicano più nessuna categoria."
            flush
          >
            <ul className="divide-y divide-separator">
              {disabled.map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                  <span className="min-w-0">
                    <span className="font-medium">{entry.text}</span>
                    <span className="block text-[13px] text-label-secondary">
                      era in {CATEGORIES[entry.category].label}
                    </span>
                  </span>
                  {canManage && (
                    <form action={restoreKeywordAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <FormPending />
                      <button
                        type="submit"
                        name="keyword"
                        value={entry.key}
                        aria-label={`Riattiva «${entry.text}»`}
                        className={buttonClass("ghost", "", "sm")}
                      >
                        Riattiva
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
