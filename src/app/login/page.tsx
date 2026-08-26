import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loginWithGoogleAction } from "@/app/actions/auth";
import { LoginForm } from "@/components/forms/LoginForm";
import { NavLink } from "@/components/NavLink";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Accedi — Finanze" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  if (await currentUser()) redirect("/gruppi");

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  // Il reset finisce qui: senza una riga che lo dica, la pagina di accesso
  // sembrerebbe la stessa di prima e il cambio non si vedrebbe da nessuna parte.
  const { password } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {password === "reimpostata" && (
        <Alert tone="success">Password aggiornata. Entra con quella nuova.</Alert>
      )}

      <Card title="Accedi">
        <LoginForm />

        {googleEnabled && (
          <form action={loginWithGoogleAction} className="mt-4 border-t border-separator pt-4">
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Apro Google…">
              Continua con Google
            </SubmitButton>
          </form>
        )}
      </Card>

      <p className="text-center text-[13px] text-label-secondary">
        <NavLink href="/password-dimenticata" className="font-semibold text-tint hover:underline">
          Password dimenticata?
        </NavLink>
      </p>

      <p className="text-center text-[13px] text-label-secondary">
        Non hai un account?{" "}
        <NavLink href="/registrati" className="font-semibold text-tint hover:underline">
          Registrati
        </NavLink>
      </p>
    </div>
  );
}
