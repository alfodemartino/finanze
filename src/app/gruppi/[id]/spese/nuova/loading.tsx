import { SkeletonForm, SkeletonPage } from "@/components/Skeletons";
import { Card } from "@/components/ui";

/** «Nuova spesa»: il titolo è già vero, i campi arrivano col gruppo. */
export default function Loading() {
  return (
    <SkeletonPage>
      <Card title="Nuova spesa" className="max-w-2xl">
        {/* Descrizione, categoria, importo, data, chi ha pagato, come si
            divide, nota. */}
        <SkeletonForm fields={7} />
      </Card>
    </SkeletonPage>
  );
}
