# SQL · Query (query)

`db.query` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Esegue un'istruzione SQL su una connessione e manda il risultato: le righe, la prima riga, il primo valore, quante righe ha cambiato. Dentro l'SQL scrivi `:nome` per un **parametro**: il valore arriva da un ingresso aggiunto che si chiama `nome` e passa al database a parte, mai dentro il testo SQL, così non si può «iniettare» altro SQL.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la query. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di un blocco di connessione (o **transazione** di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)). Non avvia il blocco. |
| **SQL** (`sql`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**SQL** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | lista | Le righe del risultato, ognuna un oggetto `{ "colonna": valore }`. Vuota se l'istruzione non dà righe. |
| **prima riga** (`first`) | oggetto | La prima riga, oppure `null` se non ce ne sono. |
| **valore** (`value`) | qualsiasi | Nascosta. Il primo valore della prima riga (per esempio il risultato di `SELECT COUNT(*)`), o `null`. |
| **righe modificate** (`affected`) | numero | Quante righe ha cambiato un `UPDATE`, `DELETE` o `INSERT`. Per una `SELECT` il numero dipende dal database: non usarlo. |
| **ultimo id** (`lastId`) | qualsiasi | Nascosta. L'ultimo numero generato da un inserimento (`AUTO_INCREMENT`, `IDENTITY`…), dove il database lo dà; altrimenti `null`. |
| **colonne** (`fields`) | lista | Nascosta. I nomi delle colonne del risultato, nell'ordine. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se c'erano più righe di quelle massime e le altre non sono uscite. |
| **Exception** (`error`) | oggetto | Quando la query non riesce: connessione mancante o chiusa, parametro senza valore, errore dell'SQL, tempo scaduto, risultato troppo grande… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **SQL** (`sql`) | testo su più righe | `SELECT * FROM tabella WHERE id = :id` | L'istruzione da eseguire, quando l'ingresso **SQL** non ha un valore. Al massimo 100000 caratteri. |
| **Righe al massimo (0 = il limite del modulo)** (`maxRows`) | da 0 a 1000000 | 0 | Quante righe al massimo mandare. 0: il limite delle impostazioni del modulo (10000 di serie). Non può superare quel limite. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 32 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **parametro** della query: si chiama **parametro 1**, **parametro 2**… e va **rinominato** con il nome usato nell'SQL, senza i due punti: per `:id` l'ingresso si chiama `id`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la query, anche se l'ingresso «lo avvia». La query parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**:

1. Il blocco prende l'SQL (quello dell'ingresso **SQL**, se ha un valore non vuoto, altrimenti quello delle impostazioni).
2. Raccoglie i valori degli ingressi aggiunti: `{ nome: valore }`.
3. Chiede al kernel di eseguire l'istruzione sulla connessione, con il limite di righe.
4. Quando arriva il risultato, manda le uscite.

### I parametri

- `:nome` (lettere, cifre e `_`, che comincia con una lettera o `_`) diventa il segnaposto del database (`$1` per PostgreSQL, `?` per MySQL e SQLite, `@p1` per SQL Server, `:1` per Oracle, `{p1:Tipo}` per ClickHouse). Il valore viaggia a parte.
- Non sono parametri i `:` dentro una stringa (`'12:30'`), un nome tra virgolette, un commento (`-- …`, `/* … */`), il cast di PostgreSQL (`valore::int`) e il testo tra `$$…$$` di PostgreSQL. Neppure un `:` seguito da una cifra o preceduto da una lettera (come in `12:30` o `a:b`).
- Un `:nome` senza un ingresso con un valore dà l'errore «Manca il valore del parametro :nome (aggiungi un ingresso «nome» al blocco)»: così un nome scritto male non diventa un `NULL` silenzioso. Un ingresso che riceve `null` manda invece `NULL`.
- Un parametro è **un valore**: non puoi usarlo per il nome di una tabella o di una colonna. Per quelli usa [SQL · Leggi tabella (SELECT)](db.select) e gli altri blocchi senza SQL, che controllano i nomi.- Oggetti e liste come valore diventano testo JSON (PostgreSQL li riceve come JSON). Un oggetto `{ "$bytes": "…" }` torna a essere binario.
- Al massimo 2000 parametri per SQL Server, 1000 per Oracle e ClickHouse, 999 per SQLite, 30000 per PostgreSQL, MySQL e MariaDB.

### Il risultato

- Le righe sono oggetti con i nomi delle colonne (per Oracle in maiuscolo). Date come testo ISO, numeri grandi come numeri o testo, binari come `{ "$bytes": "base64" }`: vedi [Blocchi database (SQL)](logicstudio-db).
- Il risultato è limitato in righe (le **Righe al massimo**, e in ogni caso quelle del modulo) e in dimensione (4096 KB di serie, misurato come JSON). Con più righe, **troncato** è vero e le altre non escono; con un risultato troppo grande, errore.
- Un'istruzione che non dà righe (`INSERT`, `UPDATE`, `CREATE TABLE`…) manda **righe** vuota, **prima riga** `null` e **righe modificate**.

### Più istruzioni

PostgreSQL (senza parametri), SQL Server e SQLite (senza parametri) accettano più istruzioni in una query, e mandano l'ultimo risultato. MySQL, MariaDB, Oracle e ClickHouse ne accettano una sola per query.

### Dentro una transazione

Collega l'uscita **transazione** di un blocco [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) a **connessione** al posto di quella della connessione: la query gira dentro la transazione e si conferma o si annulla con essa.

### Il tempo

Il tempo massimo di un'operazione è 30 secondi (impostazione del modulo). Se è più lungo del tempo massimo di un blocco, è il blocco a fermarsi per primo («SQL · Query (query) ha impiegato più di 30 s»). Una query lunga tienila per un blocco [SQL · Scorri righe (cursor)](db.cursor) o filtrala con `LIMIT`.

## Esempi

### 1. Cercare con un parametro

**SQL**: `SELECT id, cliente, totale FROM ordini WHERE cliente = :cliente ORDER BY id DESC`. Aggiungi un ingresso e chiamalo `cliente`.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Query (query)] righe ──▶ righe [Tabella]
[Campo di testo: cliente] testo ──▶ cliente
[Pulsante: Cerca] premuto ──▶ esegui                    Exception ──▶ valore [Print (console.log)]
```

Se scrivi `Rossi' OR '1'='1` nel campo, la query cerca un cliente che si chiama esattamente così: l'SQL non cambia.

### 2. Contare e mostrare un numero

**SQL**: `SELECT COUNT(*) AS n FROM ordini WHERE totale > :minimo`. Aggiungi un ingresso `minimo`.

```
[SQL · MySQL · MariaDB (connect)] connessione ──▶ connessione [SQL · Query (query)] valore ──▶ valore [Valore: ordini grandi]
[Campo numerico: minimo] valore ──▶ minimo
[Intervallo (setInterval): 30 s] impulso ──▶ esegui
```

L'uscita nascosta **valore** è il primo valore della prima riga: il numero `n`. Ogni 30 secondi il [Valore](ui.value) si aggiorna.

### 3. Scrivere e sapere quante righe

**SQL**: `UPDATE ordini SET stato = :stato WHERE id = :id`. Aggiungi gli ingressi `stato` e `id`.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Query (query)] righe modificate ──▶ a [Confronto (== ≠ < >): a < b] se vero ──▶ invia [Notify: "Ordine non trovato"]
[Selezione: stato] valore ──▶ stato                              [Costante · Variabile: 1] valore ──▶ b
[Campo numerico: id] valore ──▶ id
[Pulsante: Cambia] premuto ──▶ esegui
```

Se nessuna riga ha quell'`id`, **righe modificate** è 0 e [Confronto (== ≠ < >)](core.compare) con `a < b` e 1 dice «vero»: [Notify](lilos.notify) avvisa.

## Errori

| Messaggio | Quando |
|---|---|
| Manca la query SQL | L'SQL è vuoto. |
| Query troppo lunga (al massimo 100.000 caratteri) | L'SQL ha più di 100000 caratteri. |
| Manca il valore del parametro :nome (aggiungi un ingresso «nome» al blocco) | L'SQL ha `:nome` ma non c'è un ingresso aggiunto `nome` con un valore. |
| Troppi parametri (al massimo 2000) | La query ha più parametri di quelli che il database accetta. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Questa non è una connessione né una transazione | All'ingresso **connessione** c'è un riferimento di un cursore o di un ascolto. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | La query ha superato il tempo massimo. |
| Il database è aperto in sola lettura | (SQLite) Un'istruzione che scrive su un database aperto con **Sola lettura**. |
| … (un messaggio del database) | L'SQL non è valido, la tabella non esiste, una regola del database non è rispettata… Il messaggio è del database, su una riga. |

## Vedi anche

- [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Aggiorna (UPDATE)](db.update), [SQL · Elimina (DELETE)](db.delete), per lavorare senza scrivere SQL
- [SQL · Scorri righe (cursor)](db.cursor), per i risultati grandi
- [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction), [SQL · Tabelle e colonne (schema)](db.tables)
- [SQL · PostgreSQL (connect)](db.postgres), [SQL · MySQL · MariaDB (connect)](db.mysql), [SQL · SQL Server (connect)](db.mssql), [SQL · SQLite (open)](db.sqlite), [SQL · Oracle (connect)](db.oracle), [SQL · ClickHouse (connect)](db.clickhouse)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
