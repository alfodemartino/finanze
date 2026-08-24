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

L'app gira su Vercel con il database su Neon. Servono due variabili
d'ambiente nel progetto Vercel:

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

## Cosa non c'è (ancora)

Categorie di spesa, spese ricorrenti, budget mensili, report e grafici, import
da CSV o da ricevute. Il modello dati è già predisposto per aggiungerli.
