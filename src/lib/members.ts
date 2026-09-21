/**
 * Chi parte già spuntato fra i partecipanti di una nuova spesa.
 *
 * La scelta è dell'amministratore del gruppo (`defaultSelected` sul membro) e
 * qui non viene corretta: se li ha deselezionati tutti il form parte senza
 * partecipanti, e chi registra la spesa sceglie a mano. Un ripiego — «se non
 * ne resta nessuno, spuntali tutti» — rimetterebbe in lista proprio chi era
 * stato tolto apposta.
 *
 * I membri disattivati non arrivano fin qui: alle nuove spese non partecipano
 * comunque, e chi chiama passa già i soli membri attivi.
 */
export function defaultParticipantIds(
  members: { id: string; defaultSelected: boolean }[],
): string[] {
  return members.filter((member) => member.defaultSelected).map((member) => member.id);
}
