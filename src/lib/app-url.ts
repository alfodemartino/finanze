/**
 * L'indirizzo pubblico dell'applicazione.
 *
 * Nelle pagine i collegamenti sono relativi e questo non serve, ma dentro una
 * email un `/gruppi` non porta da nessuna parte: lì l'URL deve essere assoluto.
 */

/**
 * Il primo valore disponibile, in ordine di precedenza:
 *
 * 1. `AUTH_URL`, se qualcuno l'ha impostato a mano;
 * 2. il dominio di produzione che Vercel espone da solo a ogni deploy —
 *    così in produzione non c'è nulla da configurare;
 * 3. `localhost`, che è dove si sviluppa.
 *
 * La barra finale viene tolta: i chiamanti concatenano percorsi che iniziano
 * già con `/`, e `https://esempio.it//gruppi` è un indirizzo diverso.
 */
export function urlApp(): string {
  const esplicito = process.env.AUTH_URL?.trim();
  if (esplicito) return esplicito.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
