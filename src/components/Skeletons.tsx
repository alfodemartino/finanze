import { Card, Skeleton } from "@/components/ui";

/**
 * I pezzi con cui sono fatte le pagine di caricamento (`loading.tsx`): mentre
 * il server prepara i dati, Next mostra al loro posto questa impalcatura.
 *
 * La regola che li tiene insieme: **quello che non dipende dai dati si mostra
 * per davvero**. Titoli, descrizioni e struttura sono già noti, quindi restano
 * testo vero e non diventano rettangoli grigi; a essere sostituiti sono solo i
 * valori che stanno arrivando. Così la pagina non appare due volte — prima
 * finta e poi vera — ma si riempie.
 */

/**
 * L'involucro di ogni pagina di caricamento. Fa due cose: dice una volta sola
 * che la pagina è in attesa — `role="status"` lo annuncia a chi usa un lettore
 * di schermo, i blocchi grigi sono decorativi e restano zitti — e con
 * `skeleton-in` ritarda la propria comparsa, così le risposte rapide non fanno
 * lampeggiare l'impalcatura.
 */
export function SkeletonPage({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={`skeleton-in ${className}`}>
      <span className="sr-only">Caricamento in corso…</span>
      {children}
    </div>
  );
}

/* Larghezze diverse riga per riga: nomi tutti uguali si vedono che sono finti. */
const rowWidths = ["w-40", "w-28", "w-44", "w-32"];

/**
 * Le righe di un elenco dentro una card `flush`, chevron compreso: è la forma
 * dell'elenco dei gruppi e di quello delle spese.
 */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <ul className="divide-y divide-separator">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <Skeleton className={`h-4 max-w-full ${rowWidths[index % rowWidths.length]}`} />
            <Skeleton className="mt-2 h-3 w-52 max-w-full" />
          </span>
          <Skeleton className="h-4 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Righe «voce a sinistra, importo a destra»: saldi, debiti, riepiloghi. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3.5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <Skeleton className={`h-4 max-w-full ${rowWidths[index % rowWidths.length]}`} />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Un modulo: per ogni campo l'etichetta e la sua casella, e in fondo il
 * pulsante. Le altezze sono quelle vere di `Field` e `SubmitButton`.
 */
export function SkeletonForm({ fields = 2 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-1.5 h-11 w-full rounded-control" />
        </div>
      ))}
      <Skeleton className="h-11 w-44 max-w-full rounded-control" />
    </div>
  );
}

/** Il pulsante piccolo che alcune card hanno nell'intestazione. */
function SkeletonAction() {
  return <Skeleton className="h-7 w-40 max-w-full rounded-control" />;
}

/**
 * L'intestazione del gruppo — ritorno indietro, nome, riga di riepilogo — e il
 * controllo segmentato. Sono nel layout: si vedono così solo quando è il layout
 * stesso a doversi ancora caricare, cioè entrando nel gruppo da fuori.
 */
export function SkeletonGroupHeader() {
  return (
    <>
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-8 w-56 max-w-full" />
        <Skeleton className="mt-2 h-3.5 w-44 max-w-full" />
      </div>

      {/* La pista grigia del controllo segmentato, con dentro le quattro voci. */}
      <div className="flex gap-0.5 rounded-control bg-fill p-0.5 sm:max-w-2xl">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-7 flex-1 rounded-[7px]" />
        ))}
      </div>
    </>
  );
}

/**
 * Il contenuto della scheda «Riepilogo». Vive qui e non solo nel suo
 * `loading.tsx` perché serve anche a chi entra nel gruppo da fuori: lì la
 * scheda che si apre è questa.
 */
export function SkeletonOverview() {
  return (
    <div className="space-y-6">
      <Card
        title="Chi deve dare quanto a chi"
        description="Il numero minimo di pagamenti per pareggiare i conti di tutti."
        actions={<SkeletonAction />}
      >
        <SkeletonLines count={2} />
      </Card>

      <Card title="Saldi dei membri">
        <SkeletonLines count={3} />
      </Card>

      <Card title="Ultime spese" flush actions={<SkeletonAction />}>
        <SkeletonRows count={3} />
      </Card>
    </div>
  );
}
