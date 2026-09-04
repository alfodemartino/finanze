import { SkeletonForm, SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card, Skeleton } from "@/components/ui";

/** Scheda «Spese»: il modulo della nuova spesa e lo storico accanto. */
export default function Loading() {
  return (
    <SkeletonPage className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Nuova spesa">
        {/* Descrizione, importo, data, chi ha pagato, come si divide, nota. */}
        <SkeletonForm fields={6} />
      </Card>

      {/* La descrizione della card è un conteggio, quindi tocca anche a lei un
          grigio: senza, all'arrivo dei dati il titolo scivolerebbe in giù. */}
      <Card title="Storico spese" description={<Skeleton className="h-3 w-32" />} flush>
        <SkeletonRows count={5} />
      </Card>
    </SkeletonPage>
  );
}
