import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CambiaPasswordForm } from "@/components/forms/PasswordForms";
import { Card } from "@/components/ui";

export const metadata = { title: "Profilo — Finanze" };

export default async function ProfiloPage() {
  const sessione = await currentUser();
  if (!sessione) redirect("/login");

  // Serve sapere se l'account ha una password propria: chi è entrato solo con
  // Google non ne ha una da cambiare, e un form che chiede quella «attuale»
  // sarebbe un vicolo cieco.
  const utente = await prisma.user.findUnique({
    where: { id: sessione.id },
    select: { name: true, email: true, passwordHash: true, createdAt: true },
  });
  if (!utente) redirect("/login");

  const dati: [string, string][] = [
    ["Nome", utente.name ?? "—"],
    ["Email", utente.email],
    ["Account creato il", utente.createdAt.toLocaleDateString("it-IT")],
  ];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card title="Il tuo account" flush>
        <dl className="divide-y divide-separator">
          {dati.map(([voce, valore]) => (
            <div key={voce} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[15px] text-label-secondary">{voce}</dt>
              <dd className="text-[15px] font-medium">{valore}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Password"
        description={
          utente.passwordHash
            ? "Cambiandola ti arriva una mail di conferma: serve ad accorgersi se non sei stato tu."
            : undefined
        }
      >
        {utente.passwordHash ? (
          <CambiaPasswordForm email={utente.email} />
        ) : (
          <p className="text-[15px] text-label-secondary">
            Entri con Google, quindi la password la gestisce Google e qui non c&apos;è nulla da
            cambiare.
          </p>
        )}
      </Card>
    </div>
  );
}
