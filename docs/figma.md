# Il file Figma

Il disegno dell'interfaccia sta in un file Figma:
**[Splitter — divisione spese](https://www.figma.com/design/RaGo4fQJVHfJ4zm4epiOTu)**
(nelle bozze del team personale, piano Starter).

È stato ricostruito dal codice a fine settembre 2026, sulla base del commit
`a488f83` (i totali per categoria nel Riepilogo). Descrive l'app, non la
comanda: **se codice e Figma non coincidono, ha ragione il codice**. Il file
serve a ragionare su una modifica prima di scriverla e a mostrarla a chi non
legge il codice.

## Pagine

Il file ha due pagine.

- **Schermate** — le viste dell'app a larghezza di telefono (390 px), una
  cornice per rotta, con dati d'esempio.
- **Componenti** — i pezzi riutilizzabili da cui le schermate sono composte:
  le schermate ne usano le istanze, quindi una modifica al componente si
  propaga ovunque.

## Schermate

| Cornice | Rotta | Note |
| --- | --- | --- |
| 01 · Accedi | `/login` | Barra di navigazione per chi non ha fatto l'accesso |
| 02 · I miei gruppi | `/gruppi` | Riepilogo su tutti i gruppi, saldo per persona, elenco, creazione e ingresso |
| 03 · Gruppo · Riepilogo | `/gruppi/[id]` | Pagamenti suggeriti, saldi, spese per categoria (settembre 2026), ultime spese |
| 04 · Gruppo · Spese | `/gruppi/[id]/spese` | Form della nuova spesa e storico modificabile, con ricerca e «Categorizza» |
| 05 · Gruppo · Saldi | `/gruppi/[id]/saldi` | Pagamenti suggeriti, saldi, form e storico dei rimborsi |
| 06 · Gruppo · Membri | `/gruppi/[id]/membri` | Vista dell'amministratore: membri modificabili, invito, eliminazione del gruppo |
| 07 · Gruppo · Riepilogo (scuro) | `/gruppi/[id]` | **Incompleta**, vedi sotto |

Mancano, e vanno aggiunte se servono: la pagina «Categorie» del gruppo
(`/gruppi/[id]/categorie`, con le parole chiave e il pulsante «Categorie»
nell'intestazione del gruppo), la registrazione (`/registrati`), la
pagina iniziale (`/`), le impalcature di caricamento (`loading.tsx`) e l'overlay
con lo spinner, gli stati vuoti, i messaggi d'errore e le versioni desktop.

### Dati d'esempio

Sono inventati, ma coerenti come lo sarebbero nell'app: il gruppo «Casa» ha tre
membri (Alfonso amministratore, Giulia, Marco senza account), 1.860,60 € di
spese e saldi di +182,40 €, −97,15 € e −85,25 €, che sommano a zero. Le quote
di ogni spesa sommano al totale, e le percentuali delle categorie a 100. Chi
cambia un numero cambi anche quelli che ne dipendono.

## Variabili

Le variabili riproducono i token di `src/app/globals.css`, con gli stessi nomi
per ruolo: una utility come `bg-surface` corrisponde alla variabile
`sfondo/surface`.

| Variabile Figma | Token CSS | Utility |
| --- | --- | --- |
| `sfondo/grouped` | `--ui-grouped` | `bg-grouped` |
| `sfondo/surface` | `--ui-surface` | `bg-surface` |
| `sfondo/raised` | `--ui-raised` | `bg-raised` |
| `sfondo/fill`, `sfondo/fill-strong` | `--ui-fill`, `--ui-fill-strong` | `bg-fill`, `bg-fill-strong` |
| `testo/label`, `testo/label-secondary`, `testo/label-tertiary` | `--ui-label*` | `text-label*` |
| `separatore` | `--ui-separator` | `border-separator` |
| `sistema/tint`, `sistema/positive`, `sistema/negative` | `--ui-tint`, `--ui-positive`, `--ui-negative` | `text-tint`, `text-positive`, … |
| `categoria/orange` … `categoria/gray` | `--ui-cat-*` | `bg-category-*` |

**Due raccolte invece di due modi.** Il piano Starter ammette una sola modalità
per raccolta, quindi chiaro e scuro stanno in due raccolte con gli stessi nomi:
«Colori · chiaro» e «Colori · scuro». Tutti i componenti e le schermate usano
quella chiara; per il tema scuro va ricollegato ogni colore alla raccolta
scura. Con un piano che ammette più modi conviene fonderle in una raccolta con
i modi «Chiaro» e «Scuro»: il tema si cambierebbe con un clic sulla cornice.

Il bianco dei testi sui pulsanti blu e dei glifi delle categorie non è una
variabile, come nel codice (`text-white`).

La raccolta «Misure» contiene `raggio/control` (10), `raggio/card` (14),
`spazio/pagina` (16) e `spazio/sezione` (24). I raggi sono collegati ai
componenti; le spaziature sono dichiarate ma non ancora collegate: margini e
spazi sono scritti come numeri.

## Componenti

| Componente | Sorgente | Proprietà |
| --- | --- | --- |
| Logo | `Logo` in `ui.tsx` | — |
| Pulsante | `buttonClass` in `ui.tsx` | `Tipo` (primario, secondario, fantasma, pericolo), `Dimensione` (md, sm), `Etichetta` |
| Segmento | `SegmentedLinks` in `ui.tsx` | `Stato` (attivo, inattivo), `Etichetta` |
| Icona categoria | `CategoryIcon.tsx` | `Categoria`, `Dimensione` (md 36 px, sm 24 px) |
| Campo | `Field`, `Input`, `Select` in `ui.tsx` | `Contenuto` (valore, segnaposto, tendina), `Etichetta`, `Valore` |
| Casella | `Checkbox` in `ui.tsx` | `Stato` (spuntata, vuota) |
| Barra di navigazione | header di `layout.tsx` | `Stato` (autenticato, ospite) |
| Riga spesa | `ExpenseList.tsx` | `Descrizione`, `Importo`, `Dettagli`, `Quote`, `Nota`, `Mostra nota`, `Mostra elimina`, `Icona` |
| Riga persona | `PersonBalanceList` in `Overview.tsx` | `Tono` (credito, debito, neutro), `Nome`, `Sottotitolo`, `Importo` |
| Riga gruppo | elenco di `gruppi/(elenco)/page.tsx` | `Nome`, `Sottotitolo`, `Amministratore` |
| Riga categoria | `CategoryTotals.tsx` | `Nome`, `Importo`, `Percentuale`, `Icona` |

Qualche dettaglio che non si indovina guardando il file:

- Il **controllo segmentato** non è un componente: è una pista (fondo
  `sfondo/fill`, raggio 10, margine e spazio di 2 px) con dentro le istanze di
  «Segmento». Le schede del gruppo e il selettore Mese/Anno sono fatti così.
- Nella **Riga categoria** la lunghezza della barra è la larghezza del
  rettangolo «Valore»: 278 px è la categoria più alta, le altre in proporzione.
- Nello **storico modificabile** (schermata 04) categoria e pagatore sono in
  blu con «▾», perché nell'app sono tendine; nel Riepilogo sono testo nero.
- **Icona categoria** ha 8 delle 19 categorie: spesa alimentare, ristoranti e
  bar, casa, bollette, trasporti, viaggi e vacanze, svago e sport, più «senza
  categoria». Mancano salute, abbigliamento, istruzione, animali, regali, tasse
  e assicurazioni, sigarette, figli, cura della persona, tecnologia,
  beneficenza, altro. Una categoria nuova nel codice vuole anche la sua
  variante qui, con colore e glifo di `CategoryIcon`.

## Differenze note dall'app

- **Schermate del gruppo prima del riordino del 30 settembre 2026.** Le cornici 03
  e 04 mostrano ancora la testata con «Categorie» ed «Esporta in Excel», le
  schede solo in alto e il form della nuova spesa accanto allo storico.
  Nell'app ora ci sono il saldo personale in cima al Riepilogo, la barra delle
  schede in basso sul telefono con il «+», il menu «…» del gruppo, il menu
  dell'account (tema e uscita) e la pagina `/gruppi/[id]/spese/nuova`; le
  barre delle categorie hanno il colore della categoria. Vanno ridisegnate,
  con una cornice nuova per «Nuova spesa».

- **Importo modificabile nello storico.** Per l'amministratore l'importo di
  una spesa divisa in parti uguali o per quote è in blu e, toccato, diventa un
  campo. La schermata 04 lo mostra ancora nero.

- **Carattere.** L'app usa San Francisco sui dispositivi Apple e il carattere
  di sistema altrove. Figma elenca SF Pro, ma nel file i testi in SF Pro
  restavano invisibili, quindi il file usa **Inter**, che gli somiglia:
  larghezze e a capo possono differire di poco.
- **Solo telefono.** Le griglie a due colonne che l'app usa da `lg` in su non
  sono disegnate.
- **Controlli nativi.** Tendine, date e caselle di spunta nell'app le disegna
  il browser; nel file sono un'approssimazione (la data è scritta
  `27/09/2026`, le tendine hanno una freccia).
- **Barra di navigazione per chi non ha fatto l'accesso.** A 390 px va su due
  righe. È quello che fa anche `flex-wrap` nell'app, ma va verificato su un
  telefono vero prima di considerarlo voluto.

## Difetti aperti

- **07 · Gruppo · Riepilogo (scuro)** è stata ricollegata alla raccolta scura
  solo in parte: i testi dentro le istanze sono rimasti ai colori chiari e
  molte scritte sono nere su fondo scuro. O la si completa ricollegando i
  colori, o la si elimina.
- Nel componente **Riga spesa** il testo «Nota» ha una larghezza fissa di
  278 px invece di riempire la colonna: con una nota lunga non segue la
  larghezza della riga.

## Aggiornare il file

Quando cambia l'interfaccia, il file va tenuto dietro al codice, non il
contrario:

- un token nuovo o cambiato in `globals.css` va riportato in **entrambe** le
  raccolte di colori;
- un componente cambiato in `ui.tsx` si corregge nella pagina Componenti, e le
  schermate si aggiornano da sole;
- una pagina nuova vuole la sua cornice, con il nome `NN · Titolo` e la rotta
  nella tabella qui sopra.

Il file è stato costruito con il server MCP di Figma. Sul piano Starter le
chiamate a disposizione sono poche e finiscono in fretta: il 29 settembre 2026
sono finite a lavoro quasi completo, ed è per questo che i difetti qui sopra
sono ancora aperti. Le modifiche piccole conviene farle a mano.
