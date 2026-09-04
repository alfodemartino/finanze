import { SkeletonForm, SkeletonPage, SkeletonRows } from "@/components/Skeletons";
import { Card } from "@/components/ui";

/**
 * Quello che si vede mentre il server cerca i gruppi dell'utente. Titolo e
 * riquadri sono già quelli veri: a mancare sono solo i gruppi.
 */
export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">I miei gruppi</h1>

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
