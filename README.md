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
- **Spese** — descrizione, importo, data, chi ha pagato e come si divide: in
  parti uguali, per quote o con importi esatti. Un'anteprima mostra le quote
  mentre si compila il form.
- **Saldi** — per ogni persona: quanto ha anticipato, quanto è a suo carico e
  quanto le resta da dare o ricevere.
- **Debiti semplificati** — invece di tanti bonifici incrociati, l'app propone al
  massimo `n-1` pagamenti per `n` membri.
- **Rimborsi** — quando qualcuno salda, si registra il pagamento e i saldi si
  aggiornano.
- **Eliminazione di un gruppo** — solo l'amministratore, e solo dopo aver
  riscritto il nome del gruppo. Sparisce tutto quello che gli appartiene: spese,
  quote, rimborsi e membri. Gli account restano.
- **Export in Excel** — l'amministratore del gruppo scarica un file `.xlsx` con
  tutte le operazioni, spese e rimborsi in ordine di data: per ognuna chi ha
  pagato e a chi. Il foglio porta il nome del gruppo.
- **Aspetto in stile iOS** — riquadri arrotondati su fondo grigio, barra di
  navigazione traslucida, controllo segmentato e i colori di sistema di Apple:
  blu per ciò che si tocca, verde e rosso per crediti e debiti.
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

## Deploy in casa (Docker + Neon)

L'applicazione gira in un container Docker su una macchina di casa — nel nostro
caso un container LXC di Proxmox — mentre il database resta su Neon, nella
regione **AWS `eu-central-1` (Francoforte)**.

Il `Dockerfile` è a più stadi e ne produce due immagini: `runner`, il server di
produzione, e `migrator`, un container usa e getta che applica le migrazioni.
Sono separati perché la CLI di Prisma non deve stare nell'immagine che resta
accesa. `next.config.ts` dichiara `output: "standalone"`, quindi nel runner
finiscono solo le dipendenze tracciate.

### Variabili d'ambiente

Vivono nel file `.env` accanto al `docker-compose.yml`, mai nell'immagine:

| Variabile | Valore |
| --- | --- |
| `DATABASE_URL` | La stringa **pooled** di Neon (host con `-pooler`), con `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `AUTH_SECRET` | Una chiave generata con `npx auth secret` |
| `AUTH_URL` | Vuoto quando si accede dalla LAN, il dominio `https://…` quando l'app è pubblica |
| `COMPOSE_PROFILES` | Vuoto per la sola app, `public` per accendere anche il tunnel |
| `TUNNEL_TOKEN` | Il token del tunnel Cloudflare, solo con il profilo `public` |

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
cp .env.example .env        # poi compila DATABASE_URL e AUTH_SECRET
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
**Il merge su `main` non è più un rilascio:** il rilascio è questo script.

Le migrazioni non girano durante il build né all'avvio del server: sono un passo
separato (`docker compose run --rm migrate`, che esegue `prisma migrate deploy`).
Fuori dai container si applicano con `npx prisma migrate deploy` puntando alla
stringa di connessione **diretta** di Neon, quella senza `-pooler`.

### Spostare il database su un altro progetto Neon

1. `npx prisma migrate deploy` sulla stringa **diretta** del progetto nuovo,
   per creare tabelle e indici.
2. Copiare i dati dal vecchio al nuovo (`pg_dump --data-only` → `psql`).
3. Aggiornare `DATABASE_URL` nel `.env` con la stringa **pooled** del progetto
   nuovo e rilanciare `docker compose up -d`: le variabili si leggono all'avvio
   del container, quindi finché non lo si ricrea l'app continua a parlare col
   vecchio database.
4. Solo dopo aver verificato che l'app funziona, cancellare il vecchio
   progetto Neon.

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

## Come sono organizzati i file

```
prisma/schema.prisma      Modello dati (gruppi, membri, spese, quote, rimborsi)
prisma/seed.ts            Dati di esempio
src/lib/money.ts          Importi in centesimi, ripartizione senza resti persi
src/lib/split.ts          Calcolo delle quote di una spesa
src/lib/balances.ts       Saldi e semplificazione dei debiti
src/lib/groups.ts         Query sul database, con controllo di appartenenza
src/lib/group-cascade.ts  Ordine in cui svuotare le tabelle di un gruppo eliminato
src/lib/xlsx.ts           Scrittura dei file xlsx, senza dipendenze esterne
src/lib/export.ts         Righe dell'export di un gruppo
src/lib/theme.ts          Tema chiaro/scuro: scelta salvata e script anti-lampeggio
src/lib/loading.ts        Conteggio delle operazioni in corso e ritardo dello spinner
src/app/actions/          Server Action (autenticazione, gruppi, spese)
src/app/gruppi/           Pagine dell'applicazione
src/app/api/health/       Sonda per l'healthcheck del container
src/components/           Componenti di interfaccia e form
Dockerfile                Immagini di produzione e delle migrazioni
docker-compose.yml        Servizi sulla macchina di casa (app, migrate, tunnel)
deploy.sh                 Rilascio di una nuova versione
```

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

Categorie di spesa, spese ricorrenti, budget mensili, report e grafici, import
da CSV o da ricevute. Il modello dati è già predisposto per aggiungerli.
