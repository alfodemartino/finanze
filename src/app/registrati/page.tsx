import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { NavLink } from "@/components/NavLink";
import { Card } from "@/components/ui";

export const metadata = { title: "Crea un account — Finanze" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/gruppi");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card title="Crea un account" description="Bastano nome, email e password.">
        <RegisterForm />
      </Card>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Hai già un account?{" "}
        <NavLink href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          Accedi
        </NavLink>
      </p>
    </div>
  );
}
