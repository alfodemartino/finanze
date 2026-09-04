import { SkeletonOverview, SkeletonPage } from "@/components/Skeletons";

/**
 * Scheda «Riepilogo». Si arriva qui dal controllo segmentato, quindi
 * intestazione e schede sono già a schermo e restano ferme: cambia solo il
 * contenuto sotto.
 */
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonOverview />
    </SkeletonPage>
  );
}
