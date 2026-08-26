"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { avvisaPasswordCambiata, avvisaResetPassword } from "@/lib/mail/notify";
import {
  DURATA_TOKEN_MS,
  generaToken,
  impronta,
  richiestaTroppoRavvicinata,
  statoToken,
} from "@/lib/password-reset";
import { nuovaPasswordSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/action-state";

/**
 * La stessa identica risposta sia che l'account esista sia che non esista.
 *
 * È la regola dei gruppi applicata agli account: come chi non è membro riceve
 * un 404 e non un 403, qui chi prova un indirizzo a caso non deve poter
 * capire se quell'indirizzo è registrato. Una pagina di recupero che risponde
 * «questa email non risulta» è un elenco di iscritti a disposizione di
 * chiunque.
 */
const RISPOSTA_UNIFORME =
  "Se esiste un account con questa email, il collegamento per reimpostare la password è appena partito. Controlla la posta, anche nello spam.";

export async function richiediResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Inserisci la tua email." };

  const utente = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!utente) return { success: RISPOSTA_UNIFORME };

  // Un collegamento appena spedito basta: se no, chi conosce l'indirizzo di
  // un'altra persona può riempirle la casella premendo «invia» a ripetizione.
  const ultima = await prisma.passwordResetToken.findFirst({
    where: { userId: utente.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (richiestaTroppoRavvicinata(ultima)) return { success: RISPOSTA_UNIFORME };

  const { token, tokenHash } = generaToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: utente.id,
      tokenHash,
      expiresAt: new Date(Date.now() + DURATA_TOKEN_MS),
    },
  });

  // A risposta già mandata: chi ha chiesto il recupero legge subito cosa fare,
  // senza restare fermo sul pulsante mentre parliamo con il servizio di posta.
  after(() => avvisaResetPassword({ email: utente.email, nome: utente.name }, token));

  return { success: RISPOSTA_UNIFORME };
}

export async function reimpostaPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Collegamento non valido." };

  const parsed = nuovaPasswordSchema.safeParse({
    password: formData.get("password"),
    conferma: formData.get("conferma"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: impronta(token) },
    select: {
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!record) return { error: "Collegamento non valido. Chiedine un altro." };

  const stato = statoToken(record);
  if (stato === "usato") {
    return { error: "Questo collegamento è già stato usato. Chiedine un altro." };
  }
  if (stato === "scaduto") {
    return { error: "Questo collegamento è scaduto. Chiedine un altro." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Tutti i collegamenti ancora aperti di questo utente si chiudono, non
    // solo quello appena speso: se qualcuno ne aveva richiesto un altro, da
    // adesso non vale più.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  after(() => avvisaPasswordCambiata({ email: record.user.email, nome: record.user.name }));

  redirect("/login?password=reimpostata");
}

export async function cambiaPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const sessione = await currentUser();
  if (!sessione) redirect("/login");

  const attuale = String(formData.get("attuale") ?? "");
  if (!attuale) return { error: "Inserisci la password attuale." };

  const parsed = nuovaPasswordSchema.safeParse({
    password: formData.get("password"),
    conferma: formData.get("conferma"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const utente = await prisma.user.findUnique({
    where: { id: sessione.id },
    select: { email: true, name: true, passwordHash: true },
  });
  if (!utente?.passwordHash) {
    return { error: "Il tuo account entra con Google: la password la gestisce Google." };
  }

  // Chiedere la password attuale non è una formalità: senza, chi trovasse la
  // sessione aperta su un computer lasciato incustodito si prenderebbe
  // l'account cambiandola.
  if (!(await bcrypt.compare(attuale, utente.passwordHash))) {
    return { error: "La password attuale non è corretta." };
  }
  if (parsed.data.password === attuale) {
    return { error: "La nuova password è uguale a quella attuale." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: sessione.id }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: sessione.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  after(() => avvisaPasswordCambiata({ email: utente.email, nome: utente.name }));

  return { success: "Password aggiornata. La prossima volta entra con quella nuova." };
}
