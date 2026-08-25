import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loginWithGoogleAction } from "@/app/actions/auth";
import { LoginForm } from "@/components/forms/LoginForm";
import { NavLink } from "@/components/NavLink";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";

export const metadata = { title: "Accedi — Finanze" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/gruppi");

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card title="Accedi">
        <LoginForm />

        {googleEnabled && (
          <form action={loginWithGoogleAction} className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Apro Google…">
              Continua con Google
            </SubmitButton>
          </form>
        )}
      </Card>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Non hai un account?{" "}
        <NavLink href="/registrati" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          Registrati
        </NavLink>
      </p>
    </div>
  );
}
