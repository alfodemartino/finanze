/**
 * Le regole dei token per il recupero della password.
 *
 * Logica pura: qui non si tocca il database, si decide soltanto com'è fatto un
 * token e quando smette di valere. Le query stanno nella server action.
 */

import { createHash, randomBytes } from "node:crypto";

/** Quanto vale un collegamento di recupero. */
export const DURATA_TOKEN_MS = 60 * 60 * 1000;
export const DURATA_TOKEN_MINUTI = DURATA_TOKEN_MS / 60_000;

/**
 * Quanto si aspetta prima di poter richiedere un altro collegamento.
 * Senza, la casella di chiunque diventa bersagliabile: basta ripetere l'invio
 * del form con l'indirizzo di un'altra persona.
 */
export const ATTESA_FRA_RICHIESTE_MS = 2 * 60 * 1000;

/**
 * Un token nuovo, e la sua impronta.
 *
 * 32 byte casuali: indovinarlo è fuori discussione, quindi non serve né
 * limitare i tentativi sul collegamento né salare l'impronta. Nel database
 * finisce solo l'impronta, mai il token: chi leggesse una copia del database
 * — un backup, un log di query — non potrebbe comunque entrare in un account.
 */
export function generaToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: impronta(token) };
}

export function impronta(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type StatoToken = "valido" | "scaduto" | "usato";

/**
 * Un token già usato resta in tabella invece di essere cancellato: così chi
 * torna sul collegamento due volte legge «l'hai già usato» invece di un
 * generico «non esiste», che sembrerebbe un guasto.
 */
export function statoToken(
  token: { expiresAt: Date; usedAt: Date | null },
  adesso: Date = new Date(),
): StatoToken {
  if (token.usedAt) return "usato";
  if (token.expiresAt.getTime() <= adesso.getTime()) return "scaduto";
  return "valido";
}

/** `true` se l'ultima richiesta è troppo recente per accettarne un'altra. */
export function richiestaTroppoRavvicinata(
  ultima: { createdAt: Date } | null,
  adesso: Date = new Date(),
): boolean {
  if (!ultima) return false;
  return adesso.getTime() - ultima.createdAt.getTime() < ATTESA_FRA_RICHIESTE_MS;
}
