# SQL · SQLite (open)

`db.sqlite` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre un database **SQLite**: un file della tua home (creato se manca), oppure un database in memoria. Manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. SQLite non ha un server, né utente, né password: è la scelta più semplice per tenere dei dati di un programma.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **connetti** (`connect`) | impulso | Qualsiasi valore che arriva qui apre il database (se questo blocco ne ha già uno aperto, lo chiude prima, salvandolo). |
| **chiudi** (`close`) | impulso | Nascosta. Salva e chiude il database. |
| **password** (`password`) | testo | Nascosta. Per SQLite non serve: non c'è nessuna password. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **connessione** (`connection`) | oggetto | Il riferimento al database aperto. Vale solo per questo programma. |
| **connesso** (`connected`) | sì/no | `true` quando il database è aperto, `false` quando viene chiuso con **chiudi**. |
| **server** (`info`) | oggetto | Nascosta. Per esempio `{ "kind": "sqlite", "label": "SQLite", "name": "~/Documenti/dati.sqlite", "server": "SQLite 3.49.1", "file": "~/Documenti/dati.sqlite" }`; in memoria `name` e `file` sono `:memory:`. |
| **Exception** (`error`) | oggetto | Quando il database non si apre: file che non c'è in sola lettura, percorso non valido, file protetto, già aperto da un altro programma, troppo grande… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **File (~/…)** (`file`) | testo | `~/Documenti/dati.sqlite` | Il file del database, nella tua home: `~/…` oppure `/home/<utente>/…`. Se non c'è, viene creato (la cartella deve esistere). Non conta con **In memoria**. |
| **In memoria (senza file)** (`memory`) | sì / no | no | Se è spuntato, il database vive solo in memoria finché il programma gira: niente file, niente salvataggio. |
| **Sola lettura** (`readOnly`) | sì / no | no | Il database si può solo leggere: il file deve esistere, le istruzioni che scrivono danno errore, e il file non viene toccato (né bloccato per gli altri programmi). |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il database si apre appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre il database e manda **connessione**, poi **connesso**, poi **server**. Altrimenti si apre solo con **connetti**.
- Con **connetti** il blocco chiude il database che aveva già (salvandolo; il suo vecchio riferimento smette di funzionare) e ne apre uno nuovo.
- Con **chiudi** il blocco salva e chiude, e manda `connesso = false`.
- Quando il programma si ferma, il database si salva e si chiude.
- Niente rete: SQLite non passa dai controlli sugli indirizzi, né conta nelle connessioni di rete; conta però nelle **connessioni aperte** e nelle **operazioni al minuto** del modulo. Vedi [Blocchi database (SQL)](logicstudio-db).

### Il file

- Il file è letto e scritto **come te**, dal file system di lilOS: valgono le tue regole e la tua quota di spazio.
- Il percorso comincia con `~/` (la tua home) oppure con `/home/<utente>/`. Non sono ammessi `.` e `..`, il backslash `\`, nomi più lunghi di 255 caratteri, più di 32 livelli di cartelle. Mai la cartella `.config` di lilOS, e mai un file il cui contenuto è protetto da un'app.
- Un file che non c'è viene creato (vuoto) quando ti colleghi; la cartella in cui lo metti deve esistere. Con **Sola lettura** il file deve già esistere.
- Il file è letto **tutto in memoria** quando ti colleghi, e non può superare la **Dimensione massima di un file SQLite (MB)** delle impostazioni del modulo (1024 al massimo).
- Il salvataggio avviene **un secondo dopo l'ultima modifica**, a ogni **conferma** di una transazione e alla chiusura. Se il salvataggio automatico non riesce (spazio finito, file troppo grande), il database resta «da salvare» e si riprova alla modifica successiva; a una conferma l'errore arriva al blocco.
- Un file aperto **in scrittura** appartiene a **un programma alla volta**: un altro programma che prova ad aprirlo riceve un errore, e lo può aprire solo con **Sola lettura**. Il blocco si libera quando il programma si ferma o con **chiudi**.

### SQLite in particolare

- **Una connessione sola**: le istruzioni di un programma vanno una dopo l'altra. Una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) tiene occupato il database fino alla conferma o all'annullamento, e un [SQL · Scorri righe (cursor)](db.cursor) fino alla fine delle righe: gli altri blocchi aspettano il loro turno.
- **Un thread a parte**: SQLite gira (compilato in WebAssembly con `sql.js`) in un thread suo. Se una query supera il tempo massimo di un'operazione, il thread viene fermato **senza bloccare lilOS**, e le modifiche non ancora salvate si perdono.
- **Valori**: SQLite ha pochi tipi. Numeri e testi escono come sono; i dati binari (`BLOB`) come `{ "$bytes": "base64" }`; le date sono testi (SQLite non ha un tipo data). Sì/no diventano 1 e 0; oggetti e liste diventano testo JSON.
- **Parametri**: `:nome` diventa `?`; le stringhe, i nomi tra virgolette (`"…"`, apici inversi, parentesi quadre) e i commenti non vengono toccati.
- **Più istruzioni**: senza parametri una query può avere più istruzioni (`CREATE TABLE …; INSERT …`); esce l'ultimo risultato.
- **Scrittura**: [SQL · Inserisci (INSERT)](db.insert) usa `RETURNING *`: escono le righe inserite e **ultimo id** è il primo campo dell'ultima riga (di solito la colonna `INTEGER PRIMARY KEY`).
- **Tabelle**: [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle e le viste (senza quelle `sqlite_…`), con lo schema `main`.
- **Isolamento**: *Serializable* e *Repeatable read* aprono la transazione con `BEGIN IMMEDIATE`; gli altri livelli con `BEGIN DEFERRED`.
- Le notifiche (LISTEN e NOTIFY) non ci sono.

## Esempi

### 1. Un registro delle misure

**File** `~/Documenti/misure.sqlite`. Una volta, con [SQL · Query (query)](db.query), crea la tabella: `CREATE TABLE IF NOT EXISTS misure (id INTEGER PRIMARY KEY, quando TEXT, valore REAL)`.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Inserisci (INSERT): misure] righe inserite ──▶ valore [Print (console.log)]
[Now (data e ora)] ISO ──▶ quando (ingresso aggiunto)
[Campo numerico: temperatura] valore ──▶ valore (ingresso aggiunto)
[Intervallo (setInterval): 60 s] impulso ──▶ esegui
```

Ogni minuto una riga con l'ora e il valore va nel file. Il file si salva un secondo dopo; se chiudi lilOS e riapri il programma, i dati ci sono.

### 2. Leggere in sola lettura

**File** `~/Documenti/archivio.sqlite`, **Sola lettura** spuntata.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Leggi tabella (SELECT): misure] righe ──▶ righe [Tabella]
[Pulsante: Leggi] premuto ──▶ esegui
```

Il file non viene modificato né bloccato: lo può leggere anche un altro programma.

### 3. Un database di prova in memoria

Spunta **In memoria**: il programma crea le tabelle, le riempie e le interroga, e alla fine non resta nulla. Utile per provare una query o per calcoli temporanei.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Query (query): CREATE TABLE t (n INTEGER); INSERT INTO t VALUES (1), (2); SELECT SUM(n) AS somma FROM t] valore ──▶ valore [Print (console.log)]
                connesso ──────────────────────────▶ esegui
```

Il blocco si apre all'avvio e **connesso** fa partire la query. La query ha più istruzioni e senza parametri: esce l'ultimo risultato (la somma, 3).

## Errori

| Messaggio | Quando |
|---|---|
| Manca il file del database SQLite (per esempio ~/Documenti/dati.sqlite) | **File** è vuoto (e **In memoria** non è spuntato). |
| Percorso non valido: … | Il percorso ha un carattere non ammesso (il backslash `\`, un carattere nullo), un `.` o un `..`, oppure `~` seguito da altro che non sia `/`. |
| Percorso non valido: … (scrivi ~/… oppure /home/…) | Il percorso non comincia con `~/` né con `/`. |
| Puoi usare solo i file della tua home (~/… oppure /home/…/…): … | Il percorso non è dentro la tua home. |
| Serve il nome di un file, non la home | Il percorso è la home stessa. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è in `.config`. |
| Il contenuto di «…» è protetto da un'app: i programmi non lo usano | Il file è protetto da un'app. |
| «…» non è un file | Il percorso è una cartella. |
| La cartella «…» non esiste | La cartella del file nuovo non c'è. |
| Il file «…» non esiste | **Sola lettura** e il file non c'è. |
| Il file «…» è già aperto da un altro programma: chiudilo lì, oppure aprilo in sola lettura | Un altro programma tiene il file aperto in scrittura. |
| Il file «…» è troppo grande: … MB (al massimo … MB) | Il file supera la dimensione massima delle impostazioni del modulo. |
| Il database «…» è diventato troppo grande per salvarlo (al massimo … MB) | Il database è cresciuto oltre la dimensione massima. |
| Spazio finito: la tua home ha raggiunto la sua quota | Non c'è più spazio per salvare. |
| Il database è aperto in sola lettura | Un'istruzione che scrive su un database aperto con **Sola lettura**. |
| SQLite non ha finito in 30 s: la query è stata fermata (le modifiche non ancora salvate sono perse) | Una query ha superato il tempo massimo di un'operazione. |
| L'amministratore non permette i database SQLite (impostazioni del modulo logicstudio-db) | SQLite è disattivato nelle impostazioni del modulo. |
| no such table: … | La tabella non esiste (messaggio di SQLite, in inglese). |

Gli errori comuni di quota (connessioni, operazioni al minuto, risultato troppo grande…) sono nella pagina [Blocchi database (SQL)](logicstudio-db).

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [readFile](lilos.fileRead), [writeFile](lilos.fileWrite), per i file della home
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
