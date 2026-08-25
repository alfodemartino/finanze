import type { Metadata } from "next";
import { LoadingProvider } from "@/components/LoadingOverlay";
import { NavLink } from "@/components/NavLink";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanze — spese di famiglia",
  description: "Registra le spese di casa, calcola i saldi e scopri chi deve dare quanto a chi.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Applica il tema salvato prima del primo paint, per evitare il lampeggio. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">
        {/* Ogni navigazione e ogni invio di form che avviene qui dentro accende
            lo spinner globale: il clic ha sempre una risposta immediata. */}
        <LoadingProvider>
          <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <NavLink href="/" className="text-base font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">Finanze</span>{" "}
                <span className="text-slate-400">· spese di famiglia</span>
              </NavLink>

              <nav className="flex items-center gap-2 text-sm">
                <ThemeToggle />
                {user ? (
                  <>
                    <NavLink
                      href="/gruppi"
                      className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      I miei gruppi
                    </NavLink>
                    <span className="hidden text-slate-400 sm:inline">{user.name ?? user.email}</span>
                    <form action={logoutAction}>
                      <SubmitButton variant="ghost" pendingLabel="Esco…">
                        Esci
                      </SubmitButton>
                    </form>
                  </>
                ) : (
                  <>
                    <NavLink
                      href="/login"
                      className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Accedi
                    </NavLink>
                    <NavLink
                      href="/registrati"
                      className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
                    >
                      Crea un account
                    </NavLink>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>

          <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-400">
            Gli importi sono gestiti in centesimi: nessun centesimo si perde negli arrotondamenti.
          </footer>
        </LoadingProvider>
      </body>
    </html>
  );
}
