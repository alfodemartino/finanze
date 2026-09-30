import { SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card, Skeleton } from "@/components/ui";
import { ExpenseSearchField } from "@/components/ExpenseSearch";

/** Scheda «Spese»: lo storico con la sua ricerca. Il form ha una pagina sua. */
export default function Loading() {
  return (
    <SkeletonPage>
      {/* La descrizione della card è un conteggio, quindi tocca anche a lei un
          grigio: senza, all'arrivo dei dati il titolo scivolerebbe in giù. */}
      <Card title="Storico spese" description={<Skeleton className="h-3 w-32" />} flush>
        {/* Il campo di ricerca non dipende dai dati: c'è già, ma spento. */}
        <ExpenseSearchField />
        <SkeletonRows count={5} icon />
      </Card>
    </SkeletonPage>
  );
}
