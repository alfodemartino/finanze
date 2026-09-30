import { SkeletonForm, SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card } from "@/components/ui";

/**
 * Pagina «Categorie». Il form è dell'amministratore e il ruolo lo dice il
 * server: si disegna quello, come fa la scheda «Membri».
 */
export default function Loading() {
  return (
    <SkeletonPage className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card
        title="Parole chiave"
        description="Le parole della descrizione che propongono la categoria di una nuova spesa. In grassetto quelle decise dal gruppo."
        flush
      >
        <SkeletonRows count={6} icon />
      </Card>

      <div className="self-start">
        <Card
          title="Aggiungi una parola chiave"
          description="Vale solo per questo gruppo, e subito anche per il pulsante «Categorizza»."
        >
          <SkeletonForm fields={2} />
        </Card>
      </div>
    </SkeletonPage>
  );
}
