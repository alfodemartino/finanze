# Note per Claude Code

Contesto di lavoro su questo repository. Il [README](README.md) spiega cosa fa
l'app e come avviarla: qui ci sono solo le convenzioni da rispettare quando si
modifica il codice.

## Flusso di lavoro

Si sviluppa su un branch dedicato e **si apre sempre una pull request**: il
merge su `main` avviene dalla PR, non con un merge locale. La history del
progetto è fatta di commit `Merge pull request #N: …` e va mantenuta così.

Il deploy in produzione (Vercel) parte da solo a ogni push su `main`: un merge
è un rilascio, non un salvataggio.

Commit, PR, commenti nel codice e testi dell'interfaccia sono **in italiano**.
Il messaggio di commit spiega *perché* si cambia qualcosa, non solo cosa.

## Prima di ogni push

Vanno verdi tutti e quattro:

```bash
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run build      # build di produzione
```

Il build non richiede variabili d'ambiente: le pagine sono tutte dinamiche,
nessuna viene prerenderizzata e quindi nessuna tocca il database.

Quando la modifica si vede a schermo, non basta che il build passi: si avvia
l'app (`npm start` dopo il build) e si controlla il risultato in un browser,
alle larghezze che contano (desktop e mobile).

## Regole del dominio

Sono invarianti, non preferenze: romperle significa sbagliare i conti.

- **Gli importi sono interi di centesimi.** Mai float per il denaro. Le
  ripartizioni usano il metodo dei resti più grandi (`src/lib/money.ts`), così
  la somma delle quote è esattamente il totale della spesa.
- **La somma dei saldi di un gruppo è sempre zero.** È la proprietà verificata
  dai test in `src/lib/balances.test.ts`.
- **Chi non è membro di un gruppo riceve 404**, non 403: non si rivela nemmeno
  l'esistenza del gruppo. Le query passano da `src/lib/groups.ts`, che
  controlla l'appartenenza.
- **I membri con spese non si cancellano**: si disattivano, così lo storico
  resta coerente.

La logica di calcolo sta in `src/lib/` ed è pura: va coperta da test lì, senza
passare dal database.

## Interfaccia

Tailwind v4, senza file di configurazione: i temi e le varianti si dichiarano
in `src/app/globals.css`.

Ogni colore chiaro va accompagnato dalla sua variante `dark:`. La verifica
veloce che non ne manchi nessuna:

```bash
grep -rn "bg-white\|bg-slate-50\|text-slate-900\|border-slate-200" src --include=*.tsx | grep -v "dark:"
```

`dark:` è ridefinito con `@custom-variant`: vale sotto `data-theme="dark"` e,
solo quando l'utente non ha scelto, con `prefers-color-scheme: dark`. La scelta
del tema sta in `src/lib/theme.ts` e nel componente `ThemeToggle`.

I componenti condivisi (`Card`, `Field`, `Input`, `Alert`, `Money`, …) stanno in
`src/components/ui.tsx`: si riusano invece di ricomporre le stesse classi.

## Database

Le migrazioni **non** girano durante il build: vanno applicate a parte, con la
stringa di connessione **diretta** di Neon (quella senza `-pooler`).
`DATABASE_URL` su Vercel è invece la stringa **pooled**.
