/**
 * Le notifiche vere e proprie: chi riceve cosa.
 *
 * Qui sta la parte che conosce il dominio — quali membri hanno un account,
 * quanto tocca a ciascuno — mentre i testi stanno in `templates.ts` e la rete
 * in `send.ts`. Nessuna di queste funzioni solleva: un'email che non parte non
 * deve mai far fallire l'operazione che l'ha provocata.
 */

import { prisma } from "@/lib/db";
import { urlApp } from "@/lib/app-url";
import { inviaMail, inviaMailAMolti, type Destinatario } from "@/lib/mail/send";
import {
  mailBenvenuto,
  mailPasswordCambiata,
  mailResetPassword,
  mailSpesaRegistrata,
} from "@/lib/mail/templates";
import { DURATA_TOKEN_MINUTI } from "@/lib/password-reset";

export async function avvisaBenvenuto(a: Destinatario): Promise<void> {
  await inviaMail(a, mailBenvenuto({ nome: a.nome, urlApp: urlApp() }));
}

export async function avvisaResetPassword(a: Destinatario, token: string): Promise<void> {
  const url = `${urlApp()}/password-dimenticata/${encodeURIComponent(token)}`;
  await inviaMail(a, mailResetPassword({ nome: a.nome, url, validitaMinuti: DURATA_TOKEN_MINUTI }));
}

export async function avvisaPasswordCambiata(a: Destinatario): Promise<void> {
  await inviaMail(
    a,
    mailPasswordCambiata({ nome: a.nome, urlRecupero: `${urlApp()}/password-dimenticata` }),
  );
}

/**
 * Avvisa il gruppo che è stata registrata una spesa.
 *
 * Ricevono tutti i membri attivi che hanno un account — compreso chi l'ha
 * appena inserita, per cui la mail vale come ricevuta. I familiari senza
 * account non hanno un indirizzo e restano fuori da soli.
 *
 * Ogni messaggio è diverso dagli altri perché contiene la quota di chi lo
 * riceve, quindi partono tanti invii quanti sono i destinatari: con gruppi
 * familiari sono una manciata di mail, ben dentro il piano gratuito.
 */
export async function avvisaSpesaRegistrata(expenseId: string, autore?: string | null): Promise<void> {
  const spesa = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: {
      description: true,
      amountCents: true,
      groupId: true,
      payer: { select: { name: true } },
      group: { select: { name: true, currency: true } },
      splits: { select: { memberId: true, amountCents: true } },
    },
  });
  if (!spesa) return;

  const membri = await prisma.member.findMany({
    where: { groupId: spesa.groupId, active: true, userId: { not: null } },
    select: { id: true, user: { select: { email: true, name: true } } },
  });

  const quote = new Map(spesa.splits.map((quota) => [quota.memberId, quota.amountCents]));
  const base = urlApp();

  const messaggi = membri.flatMap((membro) => {
    const email = membro.user?.email;
    if (!email) return [];

    return [
      {
        a: { email, nome: membro.user?.name },
        messaggio: mailSpesaRegistrata({
          gruppo: spesa.group.name,
          groupId: spesa.groupId,
          descrizione: spesa.description,
          importoCents: spesa.amountCents,
          valuta: spesa.group.currency,
          pagatore: spesa.payer.name,
          autore,
          quotaCents: quote.get(membro.id),
          urlApp: base,
        }),
      },
    ];
  });

  await inviaMailAMolti(messaggi);
}
