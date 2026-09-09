import {
  SkeletonForm,
  SkeletonPage,
  SkeletonRows,
  SkeletonTotals,
} from "@/components/Skeletons";
import { Card } from "@/components/ui";

/**
 * Quello che si vede mentre il server calcola il riepilogo e cerca i gruppi
 * dell'utente. Titoli e riquadri sono già quelli veri: a mancare sono solo i
 * saldi e i gruppi.
 */
export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">I miei gruppi</h1>

      {/* Un solo blocco di riepilogo: quanti ne servano lo dicono le valute dei
          gruppi, che è proprio il dato che stiamo aspettando. */}
      <Card title="Il tuo riepilogo" flush>
        <SkeletonTotals />
      </Card>

      <Card
        title="Saldo per persona"
        description="Quanto devi dare o ricevere da ognuno, sommando i gruppi che avete in comune."
        flush
      >
        <SkeletonRows count={3} />
      </Card>

      <Card title="Gruppi a cui partecipi" flush>
        <SkeletonRows count={3} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Crea un nuovo gruppo" description="Diventi automaticamente amministratore.">
          <SkeletonForm fields={2} />
        </Card>
        <Card title="Entra in un gruppo esistente" description="Serve il codice di invito.">
          <SkeletonForm fields={1} />
        </Card>
      </div>
    </SkeletonPage>
  );
}
