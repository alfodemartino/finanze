import { getGroupForUser } from "@/lib/groups";
import { logEvent } from "@/lib/log";
import { clientIp } from "@/lib/request-ip";

/**
 * Carica il gruppo e pretende che l'utente ne sia amministratore.
 *
 * Sta qui e non in un file di server action: una funzione esportata da un file
 * `"use server"` diventerebbe un'azione che il browser può chiamare.
 *
 * Il rifiuto si registra qui e non nei chiamanti: è un punto solo invece di
 * uno per azione, e i due casi restano distinti — non essere membro del gruppo
 * è una cosa (l'app risponde come se il gruppo non esistesse), esserlo senza
 * essere amministratore è un'altra. `azione` dice quale operazione è stata
 * tentata, altrimenti il log direbbe che qualcuno ha provato qualcosa senza
 * dire cosa.
 */
export async function requireOwner(groupId: string, userId: string, azione: string) {
  const group = await getGroupForUser(groupId, userId);
  if (!group) {
    logEvent("warn", "gruppo_non_accessibile", {
      gruppo: groupId,
      utente: userId,
      azione,
      ip: await clientIp(),
    });
    return null;
  }
  if (group.viewer.role !== "OWNER") {
    logEvent("warn", "permesso_negato", {
      gruppo: groupId,
      utente: userId,
      azione,
      ip: await clientIp(),
    });
    return null;
  }
  return group;
}
