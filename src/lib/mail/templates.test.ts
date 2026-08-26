import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/money";
import {
  escapeHtml,
  mailBenvenuto,
  mailPasswordCambiata,
  mailResetPassword,
  mailSpesaRegistrata,
} from "@/lib/mail/templates";

const URL_APP = "https://finanze.example";

describe("escapeHtml", () => {
  it("neutralizza i caratteri che aprirebbero un tag", () => {
    expect(escapeHtml('<script>alert("ciao")</script>')).toBe(
      "&lt;script&gt;alert(&quot;ciao&quot;)&lt;/script&gt;",
    );
  });

  it("lascia intatto un testo normale", () => {
    expect(escapeHtml("Spesa al mercato")).toBe("Spesa al mercato");
  });
});

describe("mailBenvenuto", () => {
  it("saluta per nome e porta ai gruppi", () => {
    const mail = mailBenvenuto({ nome: "Marco", urlApp: URL_APP });

    expect(mail.oggetto).toBe("Benvenuto su Splitter");
    expect(mail.testo).toContain("Ciao Marco,");
    expect(mail.html).toContain(`${URL_APP}/gruppi`);
  });

  it("senza nome saluta lo stesso", () => {
    expect(mailBenvenuto({ nome: null, urlApp: URL_APP }).testo).toContain("Ciao,");
  });
});

describe("mailResetPassword", () => {
  const mail = mailResetPassword({ nome: "Marco", url: `${URL_APP}/password-dimenticata/xyz`, validitaMinuti: 60 });

  it("mette il collegamento in tutti e due i corpi", () => {
    // Chi legge in solo testo non ha il pulsante: senza l'URL scritto per
    // esteso non avrebbe modo di reimpostare la password.
    expect(mail.testo).toContain(`${URL_APP}/password-dimenticata/xyz`);
    expect(mail.html).toContain(`${URL_APP}/password-dimenticata/xyz`);
  });

  it("dice quanto vale e cosa fare se non è stato l'utente", () => {
    expect(mail.testo).toContain("60 minuti");
    expect(mail.testo).toContain("Se non sei stato tu");
  });
});

describe("mailPasswordCambiata", () => {
  it("non contiene un collegamento che cambia la password, ma uno per recuperarla", () => {
    const mail = mailPasswordCambiata({ nome: "Marco", urlRecupero: `${URL_APP}/password-dimenticata` });

    expect(mail.oggetto).toContain("cambiata");
    expect(mail.testo).toContain(`${URL_APP}/password-dimenticata`);
  });
});

describe("mailSpesaRegistrata", () => {
  const base = {
    gruppo: "Casa",
    groupId: "grp1",
    descrizione: "Spesa al mercato",
    importoCents: 4250,
    valuta: "EUR",
    pagatore: "Marco",
    urlApp: URL_APP,
  };

  it("riassume la spesa nell'oggetto", () => {
    const mail = mailSpesaRegistrata({ ...base, quotaCents: 2125 });

    expect(mail.oggetto).toBe(`Casa: Spesa al mercato — ${formatCents(4250)}`);
  });

  it("dice al destinatario quanto gli tocca", () => {
    const mail = mailSpesaRegistrata({ ...base, quotaCents: 2125 });

    expect(mail.testo).toContain(`La tua quota: ${formatCents(2125)}`);
    expect(mail.html).toContain(formatCents(2125));
  });

  it("avvisa chi non partecipa alla divisione", () => {
    const mail = mailSpesaRegistrata(base);

    expect(mail.testo).toContain("non partecipi a questa spesa");
  });

  it("nomina chi ha registrato la spesa solo se non è chi ha pagato", () => {
    const altro = mailSpesaRegistrata({ ...base, autore: "Anna" });
    const stesso = mailSpesaRegistrata({ ...base, autore: "Marco" });

    expect(altro.testo).toContain("Registrata da: Anna");
    expect(stesso.testo).not.toContain("Registrata da");
  });

  it("porta alla pagina delle spese del gruppo giusto", () => {
    const mail = mailSpesaRegistrata(base);

    expect(mail.testo).toContain(`${URL_APP}/gruppi/grp1/spese`);
  });

  it("non lascia passare l'HTML scritto dagli utenti", () => {
    const mail = mailSpesaRegistrata({
      ...base,
      descrizione: "<img src=x onerror=alert(1)>",
      gruppo: "<b>Casa</b>",
    });

    expect(mail.html).not.toContain("<img");
    expect(mail.html).not.toContain("<b>Casa</b>");
    expect(mail.html).toContain("&lt;img");
  });
});
