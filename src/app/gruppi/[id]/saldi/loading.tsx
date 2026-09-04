import { SkeletonForm, SkeletonLines, SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card } from "@/components/ui";

/** Scheda «Saldi»: pagamenti suggeriti, saldi, rimborso da registrare, storico. */
export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Pagamenti suggeriti"
          description="Ogni riga è un pagamento che avvicina il gruppo al pareggio."
        >
          <SkeletonLines count={2} />
        </Card>

        <Card title="Saldi dei membri">
          <SkeletonLines count={3} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Registra un rimborso"
          description="Quando qualcuno salda, segnalo qui: i saldi si aggiornano subito."
        >
          {/* Chi paga, chi riceve, importo, data, nota. */}
          <SkeletonForm fields={5} />
        </Card>

        <Card title="Rimborsi registrati" flush>
          <SkeletonRows count={3} />
        </Card>
      </div>
    </SkeletonPage>
  );
}
