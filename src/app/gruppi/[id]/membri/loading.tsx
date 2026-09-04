import { SkeletonForm, SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card, Skeleton } from "@/components/ui";

/**
 * Scheda «Membri». Le card riservate all'amministratore non si sanno ancora —
 * il ruolo lo dice il server — quindi si disegna il caso più comune: l'elenco
 * dei membri e, accanto, il codice di invito che vedono tutti.
 */
export default function Loading() {
  return (
    <SkeletonPage className="grid gap-6 lg:grid-cols-2">
      <Card title="Membri del gruppo" flush>
        <SkeletonRows count={4} />
      </Card>

      <div className="space-y-6 self-start">
        <Card title="Aggiungi un membro">
          {/* Nome e quota. */}
          <SkeletonForm fields={2} />
        </Card>

        <Card
          title="Codice di invito"
          description="Chi ha un account può usarlo per entrare nel gruppo da solo."
        >
          <Skeleton className="h-12 w-full rounded-control" />
        </Card>
      </div>
    </SkeletonPage>
  );
}
