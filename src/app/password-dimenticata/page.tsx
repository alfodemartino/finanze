import { RichiediResetForm } from "@/components/forms/PasswordForms";
import { NavLink } from "@/components/NavLink";
import { Card } from "@/components/ui";

export const metadata = { title: "Password dimenticata — Finanze" };

export default function PasswordDimenticataPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card
        title="Password dimenticata"
        description="Ti mandiamo un collegamento per sceglierne una nuova. Vale un'ora e si usa una volta sola."
      >
        <RichiediResetForm />
      </Card>

      <p className="text-center text-[13px] text-label-secondary">
        Te la sei ricordata?{" "}
        <NavLink href="/login" className="font-semibold text-tint hover:underline">
          Torna all&apos;accesso
        </NavLink>
      </p>
    </div>
  );
}
