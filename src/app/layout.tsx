import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanze — spese di famiglia",
  description: "Registra le spese di casa, calcola i saldi e scopri chi deve dare quanto a chi.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="it">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">Finanze</span>{" "}
              <span className="text-slate-400">· spese di famiglia</span>
            </Link>

            <nav className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  <Link
                    href="/gruppi"
                    className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    I miei gruppi
                  </Link>
                  <span className="hidden text-slate-400 sm:inline">{user.name ?? user.email}</span>
                  <form action={logoutAction}>
                    <SubmitButton variant="ghost" pendingLabel="Esco…">
                      Esci
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Accedi
                  </Link>
                  <Link
                    href="/registrati"
                    className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
                  >
                    Crea un account
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>

        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-400">
          Gli importi sono gestiti in centesimi: nessun centesimo si perde negli arrotondamenti.
        </footer>
      </body>
    </html>
  );
}
