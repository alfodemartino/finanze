"use client";

import {
  createContext,
  useContext,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { matchesSearch, searchTerms } from "@/lib/search";
import { EmptyState, inputClass } from "@/components/ui";

/** Una voce cercabile: il suo id e il testo preparato con `buildSearchText`. */
export type SearchItem = { id: string; text: string };

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  /** La ricerca a cui si riferisce `visible`: resta indietro mentre si digita. */
  appliedQuery: string;
  /** Le voci che corrispondono, oppure `null` quando non si sta cercando. */
  visible: Set<string> | null;
  total: number;
};

const SearchContext = createContext<SearchState | null>(null);

/**
 * La ricerca nello storico delle spese. Le righe restano quelle che disegna il
 * server: qui si decide soltanto quali mostrare, confrontando la ricerca con il
 * testo che il server ha preparato per ciascuna. Il confronto avviene tutto nel
 * browser, quindi il filtro segue la tastiera senza andare e tornare dal
 * server.
 */
export function ExpenseSearch({ items, children }: { items: SearchItem[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  // Con molte spese ridisegnare l'elenco a ogni tasto potrebbe rallentare la
  // digitazione: il campo si aggiorna subito, l'elenco appena può.
  const appliedQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const terms = searchTerms(appliedQuery);
    if (terms.length === 0) return null;
    return new Set(items.filter((item) => matchesSearch(item.text, terms)).map((item) => item.id));
  }, [items, appliedQuery]);

  return (
    <SearchContext.Provider value={{ query, setQuery, appliedQuery, visible, total: items.length }}>
      {children}
    </SearchContext.Provider>
  );
}

/**
 * Il campo di ricerca, alla maniera di iOS: lente a sinistra e, quando c'è
 * del testo, il pulsante per svuotarlo. Fuori da `ExpenseSearch` è spento:
 * così lo può mostrare anche la pagina di caricamento, dove i dati non ci sono
 * ancora.
 */
export function ExpenseSearchField() {
  const search = useContext(SearchContext);
  const query = search?.query ?? "";

  return (
    <div className="border-b border-separator p-3">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-label-secondary"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>

        <input
          type="search"
          aria-label="Cerca fra le spese"
          placeholder="Cerca"
          autoComplete="off"
          enterKeyHint="search"
          disabled={!search}
          value={query}
          onChange={(event) => search?.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") search?.setQuery("");
          }}
          // La crocetta del browser si toglie: c'è la nostra, uguale ovunque.
          className={`${inputClass} pr-11 pl-9 disabled:opacity-60 [&::-webkit-search-cancel-button]:appearance-none`}
        />

        {query && (
          <button
            type="button"
            aria-label="Svuota la ricerca"
            onClick={() => search?.setQuery("")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-label-tertiary hover:text-label-secondary"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
              <path
                d="m9 9 6 6m0-6-6 6"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-surface"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Una riga dell'elenco, che sparisce se non corrisponde alla ricerca. Fuori da
 * `ExpenseSearch` si mostra sempre: lo stesso elenco serve anche dove non si
 * cerca.
 *
 * La riga si toglie invece di nasconderla: con `hidden` resterebbe fra le
 * figlie dell'elenco e il separatore di `divide-y` comparirebbe sotto l'ultima
 * riga visibile.
 */
export function ExpenseSearchResult({ id, children }: { id: string; children: ReactNode }) {
  const visible = useContext(SearchContext)?.visible;
  if (visible && !visible.has(id)) return null;
  return children;
}

function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** Il conteggio sotto il titolo: tutte le spese, oppure quante ne ha trovate la ricerca. */
export function ExpenseSearchSummary() {
  const search = useContext(SearchContext);
  if (!search) return null;

  const { visible, total } = search;
  if (!visible) return <>{countLabel(total, "spesa registrata", "spese registrate")}.</>;
  if (visible.size === 0) return <>Nessuna spesa trovata su {total}.</>;
  return (
    <>
      {countLabel(visible.size, "spesa trovata", "spese trovate")} su {total}.
    </>
  );
}

/** Il messaggio al posto dell'elenco quando la ricerca non trova niente. */
export function ExpenseSearchEmpty() {
  const search = useContext(SearchContext);
  if (!search?.visible || search.visible.size > 0) return null;

  return <EmptyState>Nessuna spesa corrisponde a «{search.appliedQuery.trim()}».</EmptyState>;
}
