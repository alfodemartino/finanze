/**
 * Utility per gli importi.
 *
 * Tutti gli importi dell'applicazione sono numeri interi di centesimi:
 * i float non sono affidabili per il denaro (0.1 + 0.2 !== 0.3).
 */

/** Converte una stringa inserita dall'utente ("12,50", "12.5", "1.234,56") in centesimi. */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim();
  if (raw === "") return null;

  // Normalizza i separatori: l'ultimo fra "," e "." è quello decimale.
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma > lastDot) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = raw.replace(/,/g, "");
  } else {
    normalized = raw.replace(/[.,]/g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 100);
}

/** Formatta i centesimi nella valuta indicata (es. 1234 -> "12,34 €"). */
export function formatCents(cents: number, currency = "EUR", locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Formatta i centesimi senza simbolo di valuta, per gli input dei form. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Ripartisce `totalCents` in proporzione ai pesi indicati, senza perdere
 * né creare centesimi: il resto viene assegnato con il metodo dei resti
 * più grandi, a parità di resto vince l'indice più basso.
 */
export function allocateByWeights(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    // Nessun peso valido: si torna alla divisione in parti uguali.
    return allocateByWeights(totalCents, weights.map(() => 1));
  }

  const sign = totalCents < 0 ? -1 : 1;
  const absTotal = Math.abs(totalCents);

  const exact = weights.map((w) => (absTotal * w) / totalWeight);
  const floors = exact.map((value) => Math.floor(value));
  let remainder = absTotal - floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  const result = [...floors];
  for (let i = 0; remainder > 0; i = (i + 1) % order.length) {
    result[order[i].index] += 1;
    remainder -= 1;
  }

  return result.map((value) => value * sign);
}
