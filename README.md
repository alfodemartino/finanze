# Finanze — gestione delle spese familiari

Applicazione web per dividere le spese di casa: si registra chi ha pagato cosa,
l'app calcola i saldi di ogni membro e propone il **numero minimo di pagamenti**
necessari a pareggiare i conti.

## Cosa fa

- **Gruppi familiari** — ogni gruppo ha i suoi membri e la sua valuta. Si entra
  con un codice di invito, oppure si aggiungono familiari **senza account**
  (es. un figlio) che partecipano comunque alla divisione.
- **Quote per membro** — ogni membro ha un peso (`shareWeight`): con 60 e 40 le
  spese divise «per quote» seguono un 60/40, utile quando i redditi sono diversi.
- **Partecipazione di default** — l'amministratore decide chi parte già spuntato
  fra i partecipanti di una nuova spesa. Chi divide solo qualche spesa resta
  fuori dalla preselezione e si aggiunge quando serve.
- **Spese** — descrizione, importo, data, chi ha pagato e come si divide: in
  parti uguali, per quote o con importi esatti. Un'anteprima mostra le quote
  mentre si compila il form.
- **Categorie** — ogni spesa ha una categoria (spesa alimentare, bollette,
  trasporti, …) con la sua icona, un glifo bianco su un cerchio colorato. Il
  form la propone mentre si scrive la descrizione: prima guarda come il gruppo
  ha già categorizzato la stessa descrizione, poi un dizionario di parole
  chiave e marchi. Se non la riconosce la si sceglie a mano, e dallo storico la
  si cambia quando si vuole: ogni correzione diventa il suggerimento della
  volta dopo. Le spese nate senza categoria si sistemano in un colpo con il
  pulsante «Categorizza».
- **Parole chiave del gruppo** — dalla pagina «Categorie» del gruppo
  l'amministratore aggiunge parole al dizionario, le sposta da una categoria
  all'altra o disattiva quelle che sbagliano, senza toccare il codice. Le
  correzioni valgono solo per quel gruppo; gli altri membri le vedono in sola
  lettura.
- **Spese per categoria** — nel Riepilogo del gruppo, quanto si è speso in
  ogni categoria in un mese o in un anno, con la percentuale sul totale e una
  barra per confrontarle a colpo d'occhio. Il periodo si sfoglia con le frecce
  e resta nell'indirizzo (`?periodo=2026-09`, `?periodo=2026`). I rimborsi non
  contano: non sono spese.
- **Ricerca nello storico** — una casella sopra le spese le filtra mentre si
  scrive: descrizione, categoria, nota, chi ha pagato, importo e data, senza
  badare a maiuscole e accenti. Più parole vanno trovate tutte, in qualsiasi
  ordine.
- **Saldi** — per ogni persona: quanto ha anticipato, quanto è a suo carico e
  quanto le resta da dare o ricevere.
- **Riepilogo su tutti i gruppi** — in cima a «I miei gruppi»: quanto si deve
  dare o ricevere in tutto e il saldo verso ogni persona, sommando i gruppi che
  si hanno in comune. È il saldo reale con quella persona, ricostruito dalle
  spese, non la somma dei pagamenti suggeriti dentro i singoli gruppi.
- **Debiti semplificati** — invece di tanti bonifici incrociati, l'app propone al
  massimo `n-1` pagamenti per `n` membri.
- **Rimborsi** — quando qualcuno salda, si registra il pagamento e i saldi si
  aggiornano.
- **Eliminazione di un gruppo** — solo l'amministratore, e solo dopo aver
  riscritto il nome del gruppo. Sparisce tutto quello che gli appartiene: spese,
  quote, rimborsi e membri. Gli account restano.
- **Export in Excel** — l'amministratore del gruppo scarica un file `.xlsx` con
  tutte le operazioni, spese e rimborsi in ordine di data: per ognuna la
  categoria, chi ha pagato e a chi. Il foglio porta il nome del gruppo.
- **Aspetto in stile iOS** — riquadri arrotondati su fondo grigio, barra di
  navigazione traslucida e i colori di sistema di Apple: blu per ciò che si
  tocca, verde e rosso per crediti e debiti. Dentro un gruppo, sul telefono le
  schede stanno in una barra in basso con il «+» per aggiungere una spesa; da
  tablet in su sono un controllo segmentato. In cima al Riepilogo c'è il
  proprio saldo, e le azioni meno frequenti (categorie, export, tema, uscita)
  stanno nei menu «…» e dell'account.
- **Tema chiaro o scuro** — l'interfaccia segue le preferenze del sistema, ma
  dall'intestazione si può forzare il tema chiaro o quello scuro: la scelta
  resta salvata sul browser.
- **Caricamenti visibili** — ogni navigazione e ogni salvataggio accende uno
  spinner sopra la pagina, così si capisce subito che il clic è stato preso.
  Compare solo se la risposta tarda: quello che è già pronto resta immediato.

## Stack

| Ambito | Scelta |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions) |
| Linguaggio | TypeScript |
| Database | PostgreSQL con Prisma |
| Autenticazione | Auth.js (NextAuth v5): email + password, Google opzionale |
| Stile | Tailwind CSS v4, palette di sistema iOS |
| Test | Vitest |

## Avvio in locale

Serve Node 20+ e un database PostgreSQL raggiungibile.

```bash
npm install
cp .env.example .env        # poi compila DATABASE_URL e AUTH_SECRET
npx auth secret             # genera AUTH_SECRET

npm run db:migrate          # crea le tabelle
npm run db:seed             # (facoltativo) dati di esempio
npm run dev                 # http://localhost:3000
```

Con i dati di esempio puoi accedere subito:

- email `demo@finanze.local`, password `password123`
- codice di invito del gruppo dimostrativo: `DEMO123`

### Login con Google (facoltativo)

Basta valorizzare `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`: il pulsante compare
da solo nella pagina di accesso. L'URL di callback da registrare su Google è
`<AUTH_URL>/api/auth/callback/google`.

## Deploy in casa (Docker)

L'applicazione gira in un container Docker su una macchina di casa — nel nostro
caso un container LXC di Proxmox — e il database le sta accanto: è il servizio
`db` del `docker-compose.yml`, un Postgres con i dati nel volume `pgdata`.
Gli altri container lo raggiungono all'host `db`; da fuori, solo se lo si
chiede con `DB_LAN_IP` (vedi [più sotto](#accedere-al-database-con-un-client-sql)).

Il `Dockerfile` è a più stadi e ne produce due immagini: `runner`, il server di
produzione, e `migrator`, un container usa e getta che applica le migrazioni.
Sono separati perché la CLI di Prisma non deve stare nell'immagine che resta
accesa. `next.config.ts` dichiara `output: "standalone"`, quindi nel runner
finiscono solo le dipendenze tracciate.

### Variabili d'ambiente

Vivono nel file `.env` accanto al `docker-compose.yml`, mai nell'immagine:

| Variabile | Valore |
| --- | --- |
| `DATABASE_URL` | `postgresql://finanze:<POSTGRES_PASSWORD>@db:5432/finanze`, senza `?schema=public`: la usano anche `pg_dump` e `psql`, che quel parametro di Prisma lo rifiutano |
| `POSTGRES_PASSWORD` | La password dell'utente `finanze`, generata con `openssl rand -hex 24`. Va fissata prima del primo avvio: il database la registra quando crea il volume |
| `AUTH_SECRET` | Una chiave generata con `npx auth secret` |
| `AUTH_URL` | Vuoto quando si accede dalla LAN, il dominio `https://…` quando l'app è pubblica |
| `COMPOSE_PROFILES` | Vuoto per la sola app, `public` per accendere anche il tunnel |
| `TUNNEL_TOKEN` | Il token del tunnel Cloudflare, solo con il profilo `public` |
| `DB_LAN_IP` | Facoltativo: l'IP di rete locale dell'LXC, per aprire il database ai client SQL della LAN. Vuoto significa solo `127.0.0.1` |

Su `AUTH_URL` la regola non è di gusto: il codice imposta `trustHost: true`,
così Auth.js ricava l'host dagli header inoltrati. Finché si accede per
indirizzo IP conviene **lasciarlo vuoto**, altrimenti ogni indirizzo diverso da
quello scritto smette di funzionare. Con un dominio unico davanti, invece,
fissarlo evita sorprese sui redirect di login. Senza `trustHost` ogni richiesta
di login fallirebbe con `UntrustedHost`.

### Primo avvio

```bash
git clone https://github.com/alfodemartino/finanze /opt/finanze
cd /opt/finanze
cp .env.example .env        # poi compila DATABASE_URL, POSTGRES_PASSWORD e AUTH_SECRET
chmod 600 .env

docker compose build
docker compose run --rm migrate
docker compose up -d
```

Poi si verifica a strati, dal più interno al più esterno: così quando qualcosa
non va si sa subito da che parte guardare.

```bash
curl -fsS localhost:3000/api/health   # dentro la macchina  -> {"ok":true}
```

`http://<ip-macchina>:3000` da un altro dispositivo della rete, e — se il
tunnel è attivo — l'indirizzo pubblico.

### Esporre l'app su internet

Il servizio `cloudflared` sta dietro il profilo `public` e resta spento finché
non serve. Per accenderlo servono un dominio su Cloudflare e un tunnel creato
da **Zero Trust → Networks → Tunnels**, con un hostname pubblico che punta a
`http://app:3000`. Poi basta aggiungere al `.env`:

```
COMPOSE_PROFILES="public"
TUNNEL_TOKEN="…"
AUTH_URL="https://finanze.esempio.it"
```

e rilanciare `docker compose up -d`. Il tunnel apre una connessione **in
uscita** verso Cloudflare: non si aprono porte sul router, e funziona anche con
un IP dinamico o sotto CGNAT. Il certificato HTTPS lo gestisce Cloudflare.

### Rilasciare una nuova versione

```bash
./deploy.sh
```

Aggiorna il codice, ricostruisce l'immagine, applica le migrazioni e riavvia.

È l'unico modo di rilasciare: il merge su `main` non distribuisce niente da
solo, e la macchina di casa resta sulla versione precedente finché non si
lancia lo script.

Le migrazioni non girano durante il build né all'avvio del server: sono un passo
separato (`docker compose run --rm migrate`, che esegue `prisma migrate deploy`).
Il servizio aspetta che `db` sia pronto, e se è spento lo avvia.

### Log dell'applicazione

```bash
docker compose logs -f --tail=50 app        # in coda, con lo storico recente
docker compose logs -t --since 2h app       # ultime due ore, con i timestamp
docker compose logs app 2>&1 | grep -i login_fallito
```

Due avvertenze che fanno perdere tempo. Il **`2>&1` non è decorativo**: Next,
Auth.js, Prisma e gli eventi dell'app scrivono tutti su stderr, quindi senza
redirezione `grep` non li vede e si conclude che non ci sono errori proprio
mentre li si sta cercando. E i timestamp sono in **UTC**: una riga delle 03:00
sono le 05:00 italiane d'estate. Anche `--since` e `--until` ragionano in UTC.

Per cercare mentre si segue in tempo reale serve `grep --line-buffered`,
altrimenti l'output resta fermo in un buffer da qualche kilobyte.

Oltre al banner di avvio e agli errori delle librerie, l'app registra una riga
JSON per ciascuno di questi eventi — e **solo** per questi. Gli errori di
compilazione dei form (descrizione mancante, importo scritto male) restano
fuori di proposito: sono errori di battitura, e riempirne i log è il modo più
efficace per rendere inutile un log.

| Evento | Quando | Campi oltre a `ts`, `level`, `event` |
| --- | --- | --- |
| `login_fallito` | Credenziali non valide | `email`, `ip` |
| `registrazione_email_esistente` | Iscrizione su un'email già presente | `email`, `ip` |
| `invito_inesistente` | Codice di invito che non esiste | `codice`, `utente`, `ip` |
| `permesso_negato` | Membro non amministratore che tenta un'azione da amministratore | `gruppo`, `utente`, `azione`, `ip` |
| `gruppo_non_accessibile` | Azione su un gruppo di cui non si è membri | `gruppo`, `utente`, `azione`, `ip` |
| `export_negato` | Export chiesto da chi non è amministratore | `gruppo`, `utente`, `ip` |
| `quote_non_valide` | `computeSplits` rifiuta la ripartizione | `gruppo`, `modalita`, `totale_centesimi`, `partecipanti`, `motivo` |
| `riga_non_trovata` | Spesa o rimborso assente nel gruppo indicato | `gruppo`, `tipo`, `riga`, `azione` |
| `gruppo_eliminato` | Eliminazione completata (non è un errore) | `gruppo`, `nome`, `utente`, `ip` |

```
{"ts":"2026-08-27T14:32:11.482Z","level":"warn","event":"login_fallito","email":"tizio@esempio.it","ip":"93.45.1.2"}
```

Il timestamp dentro la riga è ridondante rispetto a quello di Docker: serve
perché una riga copiata altrove resti leggibile da sola. I campi vuoti non
compaiono — `ip` manca quando la richiesta arriva dalla LAN senza proxy davanti.

`ip` va letto come un'indicazione, non come una prova: viene da
`CF-Connecting-IP` (che mette Cloudflare) o da `X-Forwarded-For`, e l'app è
raggiungibile anche direttamente sulla porta 3000, dove quegli header li scrive
il chiamante. Serve a distinguere «un familiare ha sbagliato password» da
«qualcuno da fuori sta provando».

Le password non compaiono mai, in nessun evento.

### Copia giornaliera del database

Il database non ha un fornitore che ne tenga una storia: i dump di
`backup-db.sh` sono l'unico modo di tornare a com'erano i conti ieri o tre
settimane fa. Per questo il timer qui sotto **non è facoltativo**.

Lo script lancia `pg_dump` in un container `postgres`. Dump, verifica e
rinomina avvengono in un comando solo:
il file nasce `.partial` e perde l'estensione solo dopo che `pg_restore --list`
ha riletto l'archivio, così una corsa interrotta non lascia in giro qualcosa che
sembra un backup valido.

Per attivarlo, una volta sola:

```bash
sudo cp deploy/finanze-backup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now finanze-backup.timer

sudo ./backup-db.sh          # prima corsa, per vedere subito se funziona
```

Il timer scatta alle 3 di notte ed è `Persistent`: se la macchina era spenta,
la corsa saltata parte al primo avvio utile invece di essere persa.

Per controllare come sta andando:

```bash
systemctl list-timers finanze-backup.timer
journalctl -u finanze-backup -n 50
ls -lh /var/backups/finanze          # `.ultimo-successo` porta la data buona
```

`BACKUP_DIR`, `KEEP_DAYS` e `PG_IMAGE` si regolano dal `.env`; la retention
predefinita è 30 giorni.

**Una copia fuori dalla macchina.** I dump stanno sullo stesso disco del
volume `pgdata`: coprono una migrazione sbagliata o un `docker compose down
-v`, non un disco rotto o un LXC perso. La cartella `/var/backups/finanze` va
quindi portata anche altrove.

Da noi lo fa il **backup quotidiano di Proxmox dell'intero LXC**, su uno
storage diverso dal disco dell'LXC: porta con sé il volume, il `.env` e i dump.
Il job va messo **dopo le 3:15** — il timer parte alle 3 con fino a 15 minuti
di ritardo casuale — altrimenti ogni copia contiene il dump del giorno prima.
Un `rsync` verso un NAS o un bucket andrebbero bene lo stesso: quale strada
conta meno del fatto che ci sia.

### Ripristinare un dump

Si ferma l'app, si ricrea vuoto il database e si ricarica il dump.
`--single-transaction` fa sì che un errore a metà lasci il database vuoto,
invece che mezzo pieno:

```bash
docker compose stop app
docker compose exec db dropdb -U finanze finanze
docker compose exec db createdb -U finanze finanze
docker compose run --rm --no-TTY backup sh -c \
  'pg_restore --no-owner --no-privileges --exit-on-error --single-transaction \
              -d "$DATABASE_URL" /backups/finanze-<data>.dump'
docker compose up -d
```

Gli apici singoli non sono un dettaglio: `$DATABASE_URL` va espansa dentro il
container, dove punta a `db`. Vale la pena provarlo una volta a freddo, prima
che serva.

### Accedere al database con un client SQL

La porta 5432 di `db` è pubblicata sull'indirizzo scritto in `DB_LAN_IP`, mai
su tutti. Senza la variabile vale `127.0.0.1`: dal PC ci si arriva solo con un
tunnel SSH (`ssh -N -L 5432:127.0.0.1:5432 <utente>@<lxc>`, oppure l'opzione
SSH del client). Con l'IP di rete locale dell'LXC ci si collega direttamente
dalla LAN:

```
DB_LAN_IP="192.168.1.50"
```

poi `docker compose up -d db` e, dal client: host l'IP dell'LXC, porta `5432`,
database e utente `finanze`, password quella di `POSTGRES_PASSWORD`, SSL
disattivato.

Tre cose da sapere prima di farlo:

- **Il firewall dell'LXC non conta.** Docker inserisce le sue regole prima di
  quelle di `ufw`, quindi una porta pubblicata passa comunque. Per restringere
  a certi dispositivi si usa il firewall di Proxmox sull'LXC.
- **L'IP deve essere fisso** (prenotazione DHCP sul router o indirizzo statico
  in Proxmox): se cambia, `db` non riesce a legarsi alla porta, non parte, e
  l'app si ferma con lui.
- **Fuori da internet lo tiene il router**: nessun inoltro della 5432. Il tunnel
  Cloudflare non c'entra, porta solo ad `app:3000`.

L'utente `finanze` è proprietario del database e può cancellare tutto: prima di
modificare dati a mano, `sudo ./backup-db.sh`.

### Aggiornare Postgres a una versione maggiore

Le versioni minori (18.1 → 18.2) sono un `docker compose pull db` seguito da
`docker compose up -d`. Le **maggiori** (18 → 19) no, e l'errore non si vede:
dalla 18 l'immagine ufficiale tiene i dati in una sottocartella del volume con
il numero di versione (`18/docker`). Cambiando solo `PG_IMAGE`, il server
nuovo non trova niente nella sua cartella, crea un database vuoto e parte
senza lamentarsi — e `./deploy.sh` ci applica sopra le migrazioni. L'app
risulta vuota. I dati non sono persi, sono ancora nella cartella della
versione vecchia, ma nel frattempo chi usa l'app vede i conti spariti.

Si passa quindi da un dump:

1. `sudo ./backup-db.sh`, con l'immagine ancora vecchia.
2. `docker compose stop app`.
3. `PG_IMAGE="postgres:19"` nel `.env`, poi `docker compose up -d db`: nasce
   vuoto, nella sua cartella.
4. Ripristinare il dump come sopra, senza i due comandi `dropdb`/`createdb`.
5. `docker compose up -d`, e un controllo dall'app.

La cartella della versione vecchia resta nel volume e fa da via di ritorno:
rimettere il tag precedente basta a riaverla. Quando la nuova è collaudata si
cancella con
`docker compose exec db rm -rf /var/lib/postgresql/18`.

## Comandi utili

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Avvia l'app in sviluppo |
| `npm run build` | Build di produzione (esegue anche `prisma generate`) |
| `npm test` | Esegue i test |
| `npm run typecheck` | Controlla i tipi |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Applica/crea le migrazioni (**solo in sviluppo**) |
| `npm run db:studio` | Apre Prisma Studio sui dati |
| `./deploy.sh` | Rilascia una nuova versione sulla macchina di casa |
| `./backup-db.sh` | Copia il database in `/var/backups/finanze` |

## Come sono organizzati i file

```
prisma/schema.prisma      Modello dati (gruppi, membri, spese, quote, rimborsi)
prisma/seed.ts            Dati di esempio
src/lib/money.ts          Importi in centesimi, ripartizione senza resti persi
src/lib/split.ts          Calcolo delle quote di una spesa
src/lib/categories.ts     Categorie delle spese e riconoscimento dalla descrizione
src/lib/category-totals.ts  Totali per categoria: ordine, percentuali, barre
src/lib/periods.ts        Mesi e anni su cui si sommano le spese
src/lib/balances.ts       Saldi e semplificazione dei debiti
src/lib/groups.ts         Query sul database, con controllo di appartenenza
src/lib/group-cascade.ts  Ordine in cui svuotare le tabelle di un gruppo eliminato
src/lib/xlsx.ts           Scrittura dei file xlsx, senza dipendenze esterne
src/lib/export.ts         Righe dell'export di un gruppo
src/lib/theme.ts          Tema chiaro/scuro: scelta salvata e script anti-lampeggio
src/lib/loading.ts        Conteggio delle operazioni in corso e ritardo dello spinner
src/lib/log.ts            Riga JSON degli eventi da ritrovare nei log
src/lib/request-ip.ts     Indirizzo del chiamante, per i log di sicurezza
src/app/actions/          Server Action (autenticazione, gruppi, spese)
src/app/gruppi/           Pagine dell'applicazione
src/app/api/health/       Sonda per l'healthcheck del container
src/components/           Componenti di interfaccia e form
Dockerfile                Immagini di produzione e delle migrazioni
docker-compose.yml        Servizi sulla macchina di casa (db, app, migrate, backup, tunnel)
deploy.sh                 Rilascio di una nuova versione
backup-db.sh              Copia del database, lanciata dal timer systemd
deploy/                   Unit systemd per la copia giornaliera
docs/figma.md             Il file Figma dell'interfaccia: schermate, token, componenti
.github/workflows/        Test, typecheck, lint e build a ogni pull request
.claude/                  Hook che prepara l'ambiente delle sessioni sul web
```

Test, typecheck, lint e build girano da soli a ogni pull request
(`.github/workflows/verifica.yml`), con la stessa versione di Node del
`Dockerfile` e sul codice già unito a `main`. Resta comunque buona regola
lanciarli in locale prima di spingere: l'errore si vede subito, invece che
qualche minuto dopo.

## Note tecniche

- **Gli importi sono numeri interi di centesimi.** I float non sono affidabili
  per il denaro; le ripartizioni usano il metodo dei resti più grandi, così la
  somma delle quote è sempre esattamente il totale della spesa.
- **La somma dei saldi di un gruppo è sempre zero.** È la proprietà verificata
  dai test in `src/lib/balances.test.ts`.
- **Chi non è membro di un gruppo riceve 404**, non 403: non si rivela nemmeno
  l'esistenza del gruppo.
- **I membri non si cancellano se hanno spese**: vengono disattivati, così lo
  storico resta coerente e restano visibili nei saldi finché hanno conti aperti.
- **Un gruppo eliminato non lascia orfani.** I vincoli verso `Member` sono
  `RESTRICT` — è quello che protegge la regola qui sopra — quindi la cascata del
  database da sola non basta: cancellerebbe i membri mentre spese e rimborsi li
  riferiscono ancora, e si fermerebbe. `deleteGroupCascade` svuota le tabelle
  nell'ordine dichiarato da `src/lib/group-cascade.ts`, in una sola transazione:
  o sparisce tutto, o non sparisce niente.
- **Il tema scelto si applica prima del primo paint.** Uno script inline in
  `<head>` legge `localStorage` e imposta `data-theme` su `<html>`: chi usa il
  tema scuro non vede un lampo di bianco al caricamento. Il `dark:` di Tailwind
  è ridefinito con `@custom-variant` in `globals.css`, così vale sia sotto
  `data-theme="dark"` sia — in assenza di una scelta esplicita — con
  `prefers-color-scheme: dark`.
- **Lo spinner globale conta le operazioni, non le indovina.** `NavLink` riporta
  `useLinkStatus` (le navigazioni) e `SubmitButton` riporta `useFormStatus` (le
  server action) allo stesso contatore in `LoadingProvider`: finché è sopra
  zero, l'overlay copre la pagina. Compare dopo `LOADING_DELAY_MS`, così le
  risposte rapide non lo fanno lampeggiare. L'unica azione scoperta è l'export
  in Excel: è un download del browser, che non avvisa quando è finito.

## Cosa non c'è (ancora)

Spese ricorrenti, budget mensili, grafici nel tempo, import da CSV o da
ricevute. Il modello dati è già predisposto per aggiungerli.
