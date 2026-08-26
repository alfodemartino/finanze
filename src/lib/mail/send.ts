/**
 * L'unico punto del progetto che parla con il servizio di posta.
 *
 * Sta dietro una funzione sola apposta: cambiare fornitore — da Brevo a
 * Resend, il giorno che ci sarà un dominio da verificare — vuol dire
 * riscrivere questo file e nient'altro.
 */

import type { Messaggio } from "@/lib/mail/templates";

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Il nome che si legge accanto al mittente. Questo sì che ha un valore
 * predefinito: non è un dato di nessuno, è il nome dell'applicazione.
 */
const NOME_MITTENTE = process.env.MAIL_FROM_NAME?.trim() || "Splitter";

/**
 * Oltre questo tempo si smette di aspettare. Una funzione serverless che resta
 * appesa a una richiesta HTTP costa tempo di esecuzione e non consegna niente:
 * meglio rinunciare alla mail che tenere occupata l'app.
 */
const TIMEOUT_MS = 10_000;

export type Destinatario = { email: string; nome?: string | null };

/**
 * Spedisce un messaggio a un destinatario.
 *
 * **Non solleva mai**: restituisce `false` e scrive in log. Le mail di questa
 * applicazione accompagnano operazioni già andate a buon fine — un account
 * creato, una spesa salvata — e nessuna di quelle deve fallire perché il
 * servizio di posta è irraggiungibile.
 *
 * Senza `BREVO_API_KEY` o senza `MAIL_FROM` non fa nulla e dice quale delle due
 * manca: è quello che succede nei test, durante il build e in sviluppo, dove
 * né la chiave né un mittente verificato esistono.
 */
export async function inviaMail(a: Destinatario, messaggio: Messaggio): Promise<boolean> {
  const chiave = process.env.BREVO_API_KEY?.trim();
  // Il mittente non ha un valore predefinito di proposito: dev'essere un
  // indirizzo verificato su Brevo, cioè un dato di chi ospita l'applicazione,
  // e quelli stanno nell'ambiente, non nel codice.
  const mittente = process.env.MAIL_FROM?.trim();

  if (!chiave || !mittente) {
    const manca = !chiave ? "BREVO_API_KEY" : "MAIL_FROM";
    console.info(`[mail] manca ${manca}: non spedisco "${messaggio.oggetto}" a ${a.email}`);
    return false;
  }

  try {
    const risposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": chiave,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: NOME_MITTENTE, email: mittente },
        // Brevo sostituisce i mittenti su webmail gratuita con un proprio
        // dominio, per rispettare le regole di Gmail e Microsoft. Il
        // `reply-to` no: senza, rispondere a una di queste mail non
        // porterebbe da nessuna parte.
        replyTo: { name: NOME_MITTENTE, email: mittente },
        to: [{ email: a.email, name: a.nome?.trim() || undefined }],
        subject: messaggio.oggetto,
        htmlContent: messaggio.html,
        textContent: messaggio.testo,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!risposta.ok) {
      // Il corpo dell'errore di Brevo dice *perché* ha rifiutato (mittente non
      // verificato, quota giornaliera finita, chiave revocata): senza, restano
      // solo tre cifre da indovinare.
      const dettaglio = await risposta.text().catch(() => "");
      console.error(`[mail] Brevo ha risposto ${risposta.status}: ${dettaglio.slice(0, 300)}`);
      return false;
    }

    return true;
  } catch (errore) {
    console.error("[mail] invio non riuscito:", errore);
    return false;
  }
}

/**
 * Spedisce lo stesso tipo di messaggio a più persone, ognuna con il suo testo.
 *
 * Gli invii partono insieme e si aspettano tutti: `allSettled` perché il
 * fallimento di uno non deve impedire gli altri. Restituisce quanti sono
 * andati a buon fine.
 */
export async function inviaMailAMolti(
  messaggi: { a: Destinatario; messaggio: Messaggio }[],
): Promise<number> {
  const esiti = await Promise.allSettled(
    messaggi.map(({ a, messaggio }) => inviaMail(a, messaggio)),
  );
  return esiti.filter((esito) => esito.status === "fulfilled" && esito.value).length;
}
