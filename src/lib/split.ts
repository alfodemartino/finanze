import { allocateByWeights } from "@/lib/money";

export type SplitMode = "EQUAL" | "SHARES" | "EXACT";

export type SplitParticipant = {
  memberId: string;
  /** Peso usato solo dalla modalità SHARES. */
  shareWeight?: number;
  /** Importo in centesimi, usato solo dalla modalità EXACT. */
  amountCents?: number;
};

export type ComputedSplit = { memberId: string; amountCents: number };

export class SplitError extends Error {}

/**
 * Calcola la quota a carico di ogni partecipante.
 * La somma delle quote restituite è sempre esattamente `totalCents`.
 */
export function computeSplits(
  totalCents: number,
  mode: SplitMode,
  participants: SplitParticipant[],
): ComputedSplit[] {
  if (participants.length === 0) {
    throw new SplitError("Serve almeno un partecipante alla spesa.");
  }
  if (totalCents <= 0) {
    throw new SplitError("L'importo della spesa deve essere maggiore di zero.");
  }

  switch (mode) {
    case "EQUAL": {
      const amounts = allocateByWeights(totalCents, participants.map(() => 1));
      return participants.map((p, i) => ({ memberId: p.memberId, amountCents: amounts[i] }));
    }

    case "SHARES": {
      const weights = participants.map((p) => Math.max(0, p.shareWeight ?? 0));
      if (weights.every((w) => w === 0)) {
        throw new SplitError("Almeno un partecipante deve avere una quota maggiore di zero.");
      }
      const amounts = allocateByWeights(totalCents, weights);
      return participants.map((p, i) => ({ memberId: p.memberId, amountCents: amounts[i] }));
    }

    case "EXACT": {
      const amounts = participants.map((p) => p.amountCents ?? 0);
      if (amounts.some((a) => a < 0)) {
        throw new SplitError("Gli importi delle quote non possono essere negativi.");
      }
      const sum = amounts.reduce((acc, a) => acc + a, 0);
      if (sum !== totalCents) {
        throw new SplitError(
          `La somma delle quote (${(sum / 100).toFixed(2)}) non corrisponde al totale (${(
            totalCents / 100
          ).toFixed(2)}).`,
        );
      }
      return participants.map((p, i) => ({ memberId: p.memberId, amountCents: amounts[i] }));
    }
  }
}

/**
 * Ripartisce un nuovo totale fra i partecipanti di una spesa già salvata,
 * quando se ne corregge l'importo.
 *
 * Le quote si ricavano da quelle salvate, non dai pesi attuali dei membri: se
 * l'amministratore ha cambiato un peso dopo, la spesa deve restare divisa come
 * quando è stata registrata.
 *
 * - EQUAL: parti uguali fra gli stessi partecipanti. Il centesimo di resto va
 *   prima a chi l'aveva già, così una correzione non lo sposta senza motivo.
 * - SHARES: in proporzione alle quote di prima, che sono l'unica traccia dei
 *   pesi usati allora.
 * - EXACT: rifiutato. Gli importi li ha scelti chi ha registrato la spesa, e
 *   indovinare come cambiano con il totale vorrebbe dire spostare denaro fra i
 *   membri senza che nessuno l'abbia deciso.
 */
export function resplitTotal(
  totalCents: number,
  mode: SplitMode,
  previous: ComputedSplit[],
): ComputedSplit[] {
  if (previous.length === 0) {
    throw new SplitError("Serve almeno un partecipante alla spesa.");
  }
  if (totalCents <= 0) {
    throw new SplitError("L'importo della spesa deve essere maggiore di zero.");
  }

  // A parità di resto `allocateByWeights` premia l'indice più basso: in testa
  // chi aveva la quota più alta, poi un ordine stabile che non dipende da come
  // il database ha restituito le righe.
  const ordered = [...previous].sort(
    (a, b) => b.amountCents - a.amountCents || a.memberId.localeCompare(b.memberId),
  );

  switch (mode) {
    case "EQUAL":
      return computeSplits(
        totalCents,
        "EQUAL",
        ordered.map(({ memberId }) => ({ memberId })),
      );

    case "SHARES":
      return computeSplits(
        totalCents,
        "SHARES",
        ordered.map(({ memberId, amountCents }) => ({ memberId, shareWeight: amountCents })),
      );

    case "EXACT":
      throw new SplitError(
        "Questa spesa è divisa per importi esatti: per cambiarne il totale eliminala e registrala di nuovo.",
      );
  }
}
