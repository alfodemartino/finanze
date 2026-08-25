import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ButtonLink, Card } from "@/components/ui";

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect("/gruppi");

  return (
    <div className="space-y-10">
      {/* Il titolo grande di iOS: pesante, stretto di spaziatura, senza fronzoli. */}
      <section className="space-y-4 py-4">
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em] sm:text-[44px]">
          Le spese di casa, divise senza discussioni.
        </h1>
        <p className="max-w-2xl text-[17px] text-label-secondary">
          Crea il gruppo della tua famiglia, registra chi ha pagato cosa e lascia che sia
          l&apos;app a dire chi deve dare quanto a chi — con il minor numero possibile di
          pagamenti.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href="/registrati">Inizia gratis</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Ho già un account
          </ButtonLink>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Gruppi familiari">
          <p className="text-[15px] text-label-secondary">
            Ogni membro ha una quota: dividete in parti uguali, in proporzione al reddito o con
            importi decisi a mano. Si possono aggiungere anche familiari senza account.
          </p>
        </Card>
        <Card title="Saldi sempre aggiornati">
          <p className="text-[15px] text-label-secondary">
            Per ogni persona vedi quanto ha anticipato, quanto è a suo carico e quanto le resta
            da dare o da ricevere.
          </p>
        </Card>
        <Card title="Debiti semplificati">
          <p className="text-[15px] text-label-secondary">
            Invece di tanti giri di bonifici, l&apos;app calcola il numero minimo di pagamenti
            che pareggia i conti di tutti.
          </p>
        </Card>
      </div>
    </div>
  );
}
