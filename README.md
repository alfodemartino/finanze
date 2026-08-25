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
- **Export in Excel** — l'amministratore del gruppo scarica un file `.xlsx` con
  tutte le operazioni, spese e rimborsi in ordine di data: per ognuna chi ha
  pagato e a chi. Il foglio porta il nome del gruppo.
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
| Stile | Tailwind CSS v4 |
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

## Deploy (Vercel + Neon)

L'app gira su Vercel con il database su Neon, nella regione **AWS
`eu-central-1` (Francoforte)**: è la più vicina a chi usa l'app, e tenere
database e utenti nello stesso continente evita che ogni query attraversi
l'Atlantico. Servono due variabili d'ambiente nel progetto Vercel:

| Variabile | Valore |
| --- | --- |
| `DATABASE_URL` | La stringa **pooled** di Neon (host con `-pooler`), con `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `AUTH_SECRET` | Una chiave generata con `npx auth secret` |

`AUTH_URL` non serve: il codice imposta `trustHost: true`, così Auth.js
accetta l'host che arriva dal proxy di Vercel — produzione, anteprime e
dominio personalizzato — senza doverli elencare. Senza quell'opzione ogni
richiesta di login o registrazione fallisce con `UntrustedHost`.

Le migrazioni non girano durante il build: vanno applicate a parte con
`npm run db:migrate` (o `npx prisma migrate deploy`) puntando alla stringa
di connessione **diretta** di Neon, quella senza `-pooler`.

### Spostare il database su un altro progetto Neon

1. `npx prisma migrate deploy` sulla stringa **diretta** del progetto nuovo,
   per creare tabelle e indici.
2. Copiare i dati dal vecchio al nuovo (`pg_dump --data-only` → `psql`).
3. Aggiornare `DATABASE_URL` nel progetto Vercel con la stringa **pooled**
   del progetto nuovo e rifare il deploy: le variabili d'ambiente vengono
   lette al build, quindi finché non si ridistribuisce l'app continua a
   parlare col vecchio database.
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
| `npm run db:migrate` | Applica/crea le migrazioni |
| `npm run db:studio` | Apre Prisma Studio sui dati |

## Come sono organizzati i file

```
prisma/schema.prisma      Modello dati (gruppi, membri, spese, quote, rimborsi)
prisma/seed.ts            Dati di esempio
src/lib/money.ts          Importi in centesimi, ripartizione senza resti persi
src/lib/split.ts          Calcolo delle quote di una spesa
src/lib/balances.ts       Saldi e semplificazione dei debiti
src/lib/groups.ts         Query sul database, con controllo di appartenenza
src/lib/xlsx.ts           Scrittura dei file xlsx, senza dipendenze esterne
src/lib/export.ts         Righe dell'export di un gruppo
src/lib/theme.ts          Tema chiaro/scuro: scelta salvata e script anti-lampeggio
src/lib/loading.ts        Conteggio delle operazioni in corso e ritardo dello spinner
src/app/actions/          Server Action (autenticazione, gruppi, spese)
src/app/gruppi/           Pagine dell'applicazione
src/components/           Componenti di interfaccia e form
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
