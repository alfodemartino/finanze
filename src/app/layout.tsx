import type { Metadata, Viewport } from "next";
import { LoadingProvider } from "@/components/LoadingOverlay";
import { NavLink } from "@/components/NavLink";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitter",
  description: "Registra le spese di casa, calcola i saldi e scopri chi deve dare quanto a chi.",
};

/* Sotto la barra di stato dell'iPhone si vede lo sfondo della pagina, non una striscia bianca. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Applica il tema salvato prima del primo paint, per evitare il lampeggio. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        {/* Ogni navigazione e ogni invio di form che avviene qui dentro accende
            lo spinner globale: il clic ha sempre una risposta immediata. */}
        <LoadingProvider>
          {/* La barra di navigazione di iOS: resta in alto, è traslucida e sotto
              di lei il contenuto scorre sfocato. La separa dalla pagina un
              capello, non un bordo. */}
          <header className="sticky top-0 z-40 border-b border-separator bg-surface/75 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <NavLink href="/" className="text-[17px] font-semibold tracking-tight">
                Splitter
                <span className="ml-1.5 hidden font-normal text-label-secondary sm:inline">
                  · divisione spese
                </span>
              </NavLink>

              <nav className="flex items-center gap-1">
                <ThemeToggle />
                {user ? (
                  <>
                    <NavLink
                      href="/gruppi"
                      className="rounded-control px-3 py-1.5 text-[15px] text-tint transition hover:bg-fill"
                    >
                      I miei gruppi
                    </NavLink>
                    <span className="hidden text-[15px] text-label-secondary sm:inline">
                      {user.name ?? user.email}
                    </span>
                    <form action={logoutAction}>
                      <SubmitButton variant="ghost" size="sm" pendingLabel="Esco…">
                        Esci
                      </SubmitButton>
                    </form>
                  </>
                ) : (
                  <>
                    <NavLink
                      href="/login"
                      className="rounded-control px-3 py-1.5 text-[15px] text-tint transition hover:bg-fill"
                    >
                      Accedi
                    </NavLink>
                    <NavLink
                      href="/registrati"
                      className="rounded-control bg-tint px-3 py-1.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:opacity-80"
                    >
                      Crea un account
                    </NavLink>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">{children}</main>

          <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-[12px] text-label-tertiary">
            Gli importi sono gestiti in centesimi: nessun centesimo si perde negli arrotondamenti.
          </footer>
        </LoadingProvider>
      </body>
    </html>
  );
}
