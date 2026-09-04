import { SkeletonGroupHeader, SkeletonOverview, SkeletonPage } from "@/components/Skeletons";

/**
 * L'attesa di chi entra in un gruppo da fuori: qui non c'è ancora niente a
 * schermo, nemmeno il nome del gruppo, perché deve caricarsi il layout. Si
 * disegna quindi tutta la pagina — intestazione, schede e riepilogo — e a mano
 * a mano che il server risponde ogni pezzo prende il posto del suo grigio.
 */
export default function Loading() {
  return (
    <SkeletonPage className="space-y-5">
      <SkeletonGroupHeader />
      <SkeletonOverview />
    </SkeletonPage>
  );
}
