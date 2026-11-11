# SQL · Tabelle e colonne (schema)

`db.tables` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Elenca le **tabelle e le viste** del database; con il nome di una tabella, elenca le sue **colonne**. Serve per scoprire com'è fatto un database prima di scrivere le query, o per costruire un programma che si adatta alle tabelle che trova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la lettura. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione. Non avvia il blocco. |
| **tabella** (`table`) | testo | Se ha un valore non vuoto, prende il posto della **Tabella** delle impostazioni: il blocco elenca le colonne di quella tabella. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **tabelle** (`tables`) | lista | Senza una tabella: le tabelle e le viste, ognuna `{ "schema": "public", "name": "ordini", "type": "table" }` (`type` è `table` o `view`). |
| **colonne** (`columns`) | lista | Con una tabella: le colonne, ognuna `{ "name": "id", "type": "integer", "nullable": false, "default": "nextval(…)", "key": true }`. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, nome non valido, tempo scaduto… |

Ogni volta esce **una sola** delle due uscite: **tabelle** se non c'è una tabella, **colonne** se c'è.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tabella (vuota: tutte le tabelle)** (`table`) | testo | vuoto | La tabella di cui elencare le colonne, quando l'ingresso **tabella** non ha un valore. Vuota: elenca le tabelle. `schema.tabella` indica uno schema. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**:

- **senza tabella** il blocco manda su **tabelle** l'elenco delle tabelle e delle viste (al massimo le righe massime del modulo, 10000 di serie);
- **con una tabella** manda su **colonne** le sue colonne, nell'ordine in cui sono nella tabella.

Le colonne hanno: `name` (il nome), `type` (il tipo, come lo scrive il database: `integer`, `varchar(80)`, `NUMBER(10,2)`…), `nullable` (sì/no: accetta `NULL`), `default` (il valore predefinito, o `null`) e `key` (sì/no: fa parte della chiave primaria).

### Cosa elenca ogni database

| Database | Tabelle |
|---|---|
| PostgreSQL | Tabelle e viste di tutti gli schemi, tranne `pg_catalog` e `information_schema`. Con `schema.tabella` si sceglie lo schema; senza, quello corrente. |
| MySQL · MariaDB | Quelle del database scelto nella connessione (`schema` è il nome del database). |
| SQL Server | Quelle del database scelto nella connessione. |
| SQLite | Le tabelle e le viste del file (senza quelle di sistema `sqlite_…`), con lo schema `main`. |
| Oracle | Le tabelle e le viste dell'utente con cui ti sei collegato (`schema` è il suo nome). I nomi sono in maiuscolo. |
| ClickHouse | Quelle del database scelto nella connessione. |

I nomi delle colonne e delle tabelle che escono si possono usare negli altri blocchi database: per esempio **name** di ogni elemento di **tabelle** va nell'ingresso **tabella** di [SQL · Leggi tabella (SELECT)](db.select).

## Esempi

### 1. Scoprire le tabelle

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Tabelle e colonne (schema)] tabelle ──▶ righe [Tabella]
[Pulsante: Elenca] premuto ──▶ esegui
```

La [Tabella](ui.table) mostra `schema`, `name` e `type` di ogni tabella e vista.

### 2. Le colonne di una tabella scelta

Usa l'ingresso nascosto **tabella**.

```
[Selezione: tabella] valore ──▶ tabella [SQL · Tabelle e colonne (schema)] colonne ──▶ righe [Tabella]
[SQL · MySQL · MariaDB (connect)] connessione ──▶ connessione
[Pulsante: Mostra] premuto ──▶ esegui
```

Scegli `clienti` e premi **Mostra**: la tabella mostra nome, tipo, se accetta `NULL`, il valore predefinito e se è la chiave.

### 3. Controllare che una tabella esista

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Tabelle e colonne (schema)] tabelle ──▶ elenco [Memoria (set · get)]
[All'avvio (main)] impulso ──▶ esegui
```

All'avvio il programma legge l'elenco delle tabelle e lo tiene in memoria; con [SQL · Query (query)](db.query) puoi poi creare, solo se manca, la tabella che serve (`CREATE TABLE IF NOT EXISTS …`).

## Errori

| Messaggio | Quando |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Questa non è una connessione né una transazione | All'ingresso **connessione** c'è un riferimento di un cursore o di un ascolto. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | L'elenco supera la dimensione massima. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | La lettura ha superato il tempo massimo. |

Una tabella che non esiste dà **colonne** vuota, non un errore.

## Vedi anche

- [SQL · Leggi tabella (SELECT)](db.select), [SQL · Query (query)](db.query)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
