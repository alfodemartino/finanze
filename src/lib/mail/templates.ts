/**
 * I testi delle email.
 *
 * Sono funzioni pure: prendono dei dati e restituiscono oggetto, testo e HTML.
 * Nessuna sa del database né della rete, così si provano con un test come il
 * resto di `src/lib`, senza chiamare Brevo.
 *
 * Ogni messaggio ha sempre **due corpi**: quello HTML e quello di solo testo.
 * Non è un lusso: i client che non mostrano l'HTML leggono il secondo, e una
 * mail che ha entrambi i corpi passa più facilmente i filtri antispam.
 */

import { formatCents } from "@/lib/money";

export type Messaggio = {
  oggetto: string;
  testo: string;
  html: string;
};

const NOME_APP = "Splitter";

const ENTITÀ: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Neutralizza l'HTML nei dati che arrivano dagli utenti.
 *
 * Nomi di gruppi, descrizioni delle spese e nomi dei membri finiscono dentro
 * il corpo della mail: senza questo, chi scrive `<b>` in una descrizione
 * cambierebbe l'aspetto del messaggio di tutti gli altri.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (carattere) => ENTITÀ[carattere]);
}

/* Gli stili nelle email vanno scritti sull'elemento: i client di posta buttano
   via i fogli di stile, e Gmail toglie perfino i `<style>` nell'intestazione. */
const STILE_CORPO =
  "margin:0;padding:24px;background:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e";
const STILE_CARD =
  "max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px";
const STILE_TITOLO = "margin:0 0 16px;font-size:20px;font-weight:600;letter-spacing:-0.2px";
const STILE_TESTO = "margin:0 0 14px;font-size:15px;line-height:1.5";
const STILE_PULSANTE =
  "display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px";
const STILE_PIEDE = "margin:24px 0 0;font-size:12px;line-height:1.5;color:#8e8e93";
const STILE_RIGA = "margin:0 0 6px;font-size:15px;line-height:1.5";

/** Il guscio comune: riquadro bianco su fondo grigio, come l'app. */
function pagina(titolo: string, corpo: string, piede: string): string {
  return [
    `<div style="${STILE_CORPO}">`,
    `<div style="${STILE_CARD}">`,
    `<h1 style="${STILE_TITOLO}">${escapeHtml(titolo)}</h1>`,
    corpo,
    `<p style="${STILE_PIEDE}">${piede}</p>`,
    "</div>",
    "</div>",
  ].join("");
}

function paragrafo(testo: string): string {
  return `<p style="${STILE_TESTO}">${escapeHtml(testo)}</p>`;
}

function pulsante(testo: string, url: string): string {
  return `<p style="${STILE_TESTO}"><a href="${escapeHtml(url)}" style="${STILE_PULSANTE}">${escapeHtml(testo)}</a></p>`;
}

const PIEDE_STANDARD = `Messaggio automatico di ${NOME_APP}. A questa casella non risponde nessuno.`;

/** Il saluto: «Ciao Marco,» oppure «Ciao,» se il nome non c'è. */
function saluto(nome?: string | null): string {
  const pulito = nome?.trim();
  return pulito ? `Ciao ${pulito},` : "Ciao,";
}

// ---------------------------------------------------------------------------
// Registrazione
// ---------------------------------------------------------------------------

export function mailBenvenuto({ nome, urlApp }: { nome?: string | null; urlApp: string }): Messaggio {
  const righe = [
    saluto(nome),
    `il tuo account su ${NOME_APP} è pronto.`,
    "Crea un gruppo e invita chi divide le spese con te, oppure entra in un gruppo esistente con il codice di invito che ti hanno dato.",
  ];

  return {
    oggetto: `Benvenuto su ${NOME_APP}`,
    testo: [...righe, "", `Apri l'app: ${urlApp}/gruppi`, "", PIEDE_STANDARD].join("\n"),
    html: pagina(
      `Benvenuto su ${NOME_APP}`,
      righe.map(paragrafo).join("") + pulsante("Vai ai tuoi gruppi", `${urlApp}/gruppi`),
      PIEDE_STANDARD,
    ),
  };
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export function mailResetPassword({
  nome,
  url,
  validitaMinuti,
}: {
  nome?: string | null;
  url: string;
  validitaMinuti: number;
}): Messaggio {
  const righe = [
    saluto(nome),
    `hai chiesto di reimpostare la password di ${NOME_APP}.`,
    `Il collegamento qui sotto vale ${validitaMinuti} minuti e si può usare una volta sola.`,
    "Se non sei stato tu, ignora questo messaggio: la password resta quella di prima.",
  ];

  return {
    oggetto: `Reimposta la password di ${NOME_APP}`,
    testo: [...righe, "", url, "", PIEDE_STANDARD].join("\n"),
    html: pagina(
      "Reimposta la password",
      righe.map(paragrafo).join("") + pulsante("Scegli una nuova password", url),
      PIEDE_STANDARD,
    ),
  };
}

export function mailPasswordCambiata({
  nome,
  urlRecupero,
}: {
  nome?: string | null;
  urlRecupero: string;
}): Messaggio {
  const righe = [
    saluto(nome),
    `la password del tuo account ${NOME_APP} è stata cambiata poco fa.`,
    "Se sei stato tu non devi fare nulla.",
    "Se invece non riconosci questo cambio, reimposta subito la password dal collegamento qui sotto: chi conosce la vecchia password non potrà più entrare.",
  ];

  return {
    oggetto: `La password di ${NOME_APP} è stata cambiata`,
    testo: [...righe, "", urlRecupero, "", PIEDE_STANDARD].join("\n"),
    html: pagina(
      "Password cambiata",
      righe.map(paragrafo).join("") + pulsante("Non sono stato io", urlRecupero),
      PIEDE_STANDARD,
    ),
  };
}

// ---------------------------------------------------------------------------
// Spese
// ---------------------------------------------------------------------------

export type DatiSpesa = {
  gruppo: string;
  groupId: string;
  descrizione: string;
  importoCents: number;
  valuta: string;
  pagatore: string;
  /** Chi ha usato l'app per registrarla, che può non essere chi ha pagato. */
  autore?: string | null;
  /** Quanto tocca a chi riceve la mail: assente se non partecipa alla spesa. */
  quotaCents?: number;
  urlApp: string;
};

export function mailSpesaRegistrata(dati: DatiSpesa): Messaggio {
  const importo = formatCents(dati.importoCents, dati.valuta);
  const url = `${dati.urlApp}/gruppi/${dati.groupId}/spese`;

  const dettagli: [string, string][] = [
    ["Gruppo", dati.gruppo],
    ["Spesa", dati.descrizione],
    ["Importo", importo],
    ["Ha pagato", dati.pagatore],
    [
      "La tua quota",
      dati.quotaCents === undefined
        ? "non partecipi a questa spesa"
        : formatCents(dati.quotaCents, dati.valuta),
    ],
  ];

  // Chi registra la spesa non è per forza chi l'ha anticipata: quando le due
  // persone coincidono dirlo due volte sarebbe solo rumore.
  const autore = dati.autore?.trim();
  if (autore && autore !== dati.pagatore) dettagli.push(["Registrata da", autore]);

  const righe = dettagli.map(([voce, valore]) => `${voce}: ${valore}`);

  return {
    oggetto: `${dati.gruppo}: ${dati.descrizione} — ${importo}`,
    testo: [
      `È stata registrata una nuova spesa.`,
      "",
      ...righe,
      "",
      `Vedi le spese del gruppo: ${url}`,
      "",
      PIEDE_STANDARD,
    ].join("\n"),
    html: pagina(
      "Nuova spesa registrata",
      dettagli
        .map(
          ([voce, valore]) =>
            `<p style="${STILE_RIGA}"><span style="color:#8e8e93">${escapeHtml(voce)}:</span> <strong>${escapeHtml(valore)}</strong></p>`,
        )
        .join("") + `<div style="height:18px"></div>` + pulsante("Apri il gruppo", url),
      PIEDE_STANDARD,
    ),
  };
}
