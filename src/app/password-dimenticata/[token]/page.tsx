import { prisma } from "@/lib/db";
import { impronta, statoToken } from "@/lib/password-reset";
import { ReimpostaPasswordForm } from "@/components/forms/PasswordForms";
import { NavLink } from "@/components/NavLink";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Scegli una nuova password — Finanze" };

const MOTIVI = {
  scaduto: "Questo collegamento è scaduto: valeva un'ora.",
  usato: "Questo collegamento è già stato usato.",
} as const;

function CollegamentoNonValido({ motivo }: { motivo: string }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card title="Collegamento non più valido">
        <div className="space-y-4">
          <Alert tone="error">{motivo}</Alert>
          <p className="text-[15px] text-label-secondary">
            Chiedine un altro: il modulo è a un tocco da qui e la password attuale resta valida
            finché non ne scegli una nuova.
          </p>
          <NavLink href="/password-dimenticata" className="font-semibold text-tint hover:underline">
            Chiedi un nuovo collegamento
          </NavLink>
        </div>
      </Card>
    </div>
  );
}

/**
 * Lo stato del collegamento si controlla già qui, prima di mostrare il form:
 * scoprire che è scaduto dopo aver scelto e riscritto una password sarebbe una
 * piccola crudeltà. Il controllo vero resta comunque nella server action,
 * perché fra questa pagina e l'invio del form passa del tempo.
 */
export default async function ReimpostaPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const chiaro = decodeURIComponent(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: impronta(chiaro) },
    select: { expiresAt: true, usedAt: true, user: { select: { email: true } } },
  });
  if (!record) return <CollegamentoNonValido motivo="Questo collegamento non è valido." />;

  const stato = statoToken(record);
  if (stato !== "valido") return <CollegamentoNonValido motivo={MOTIVI[stato]} />;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card title="Scegli una nuova password" description="Poi entra con questa.">
        <ReimpostaPasswordForm token={chiaro} email={record.user.email} />
      </Card>
    </div>
  );
}
