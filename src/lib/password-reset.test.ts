import { describe, expect, it } from "vitest";
import {
  ATTESA_FRA_RICHIESTE_MS,
  DURATA_TOKEN_MS,
  generaToken,
  impronta,
  richiestaTroppoRavvicinata,
  statoToken,
} from "@/lib/password-reset";

describe("generaToken", () => {
  it("non produce mai due volte lo stesso token", () => {
    const token = new Set(Array.from({ length: 50 }, () => generaToken().token));

    expect(token.size).toBe(50);
  });

  it("restituisce l'impronta del token, non il token", () => {
    const { token, tokenHash } = generaToken();

    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toBe(impronta(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produce un token che sta in un URL senza essere codificato", () => {
    // base64url: nessun `+`, `/` o `=` da far passare per encodeURIComponent.
    expect(generaToken().token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("statoToken", () => {
  const adesso = new Date("2026-08-26T10:00:00Z");
  const fraUnOra = new Date(adesso.getTime() + DURATA_TOKEN_MS);

  it("è valido finché non scade e nessuno l'ha usato", () => {
    expect(statoToken({ expiresAt: fraUnOra, usedAt: null }, adesso)).toBe("valido");
  });

  it("è scaduto quando il momento è arrivato", () => {
    expect(statoToken({ expiresAt: adesso, usedAt: null }, adesso)).toBe("scaduto");
  });

  it("è usato anche se non è ancora scaduto", () => {
    expect(statoToken({ expiresAt: fraUnOra, usedAt: adesso }, adesso)).toBe("usato");
  });

  it("un token usato resta usato, non diventa scaduto", () => {
    const dopo = new Date(adesso.getTime() + 2 * DURATA_TOKEN_MS);

    expect(statoToken({ expiresAt: fraUnOra, usedAt: adesso }, dopo)).toBe("usato");
  });
});

describe("richiestaTroppoRavvicinata", () => {
  const adesso = new Date("2026-08-26T10:00:00Z");

  it("lascia passare la prima richiesta", () => {
    expect(richiestaTroppoRavvicinata(null, adesso)).toBe(false);
  });

  it("blocca chi riprova subito", () => {
    const unMinutoFa = new Date(adesso.getTime() - 60_000);

    expect(richiestaTroppoRavvicinata({ createdAt: unMinutoFa }, adesso)).toBe(true);
  });

  it("riapre dopo l'attesa", () => {
    const passata = new Date(adesso.getTime() - ATTESA_FRA_RICHIESTE_MS);

    expect(richiestaTroppoRavvicinata({ createdAt: passata }, adesso)).toBe(false);
  });
});
