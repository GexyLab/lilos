# SQL · Inserisci (INSERT)

`db.insert` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Inserisce una riga, o una lista di righe, in una tabella **senza scrivere SQL**. La riga è un oggetto `{ "colonna": valore }` sull'ingresso **riga**; se non lo usi, gli ingressi aggiunti sono le colonne della riga. I valori passano a parte, come parametri.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'inserimento. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione (o di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)). Non avvia il blocco. |
| **riga** (`row`) | qualsiasi | Un oggetto `{ "colonna": valore }` (una riga) o una lista di oggetti (più righe). Se ha un valore (anche vuoto, ma non `null`), gli ingressi aggiunti non si usano. Non avvia il blocco. |
| **tabella** (`table`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Tabella** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe inserite** (`affected`) | numero | Quante righe sono state inserite. |
| **ultimo id** (`lastId`) | qualsiasi | Il numero generato dal database per la riga nuova (`AUTO_INCREMENT`, `IDENTITY`, `INTEGER PRIMARY KEY`…), dove il database lo dà; altrimenti `null`. |
| **righe inserite** (`rows`) | lista | Nascosta. Le righe inserite, come le ha restituite il database (con i valori generati). Solo con PostgreSQL, SQL Server e SQLite; negli altri è vuota. |
| **Exception** (`error`) | oggetto | Quando l'inserimento non riesce: nome non valido, riga che non è un oggetto, valore non accettato dal database, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tabella (schema.tabella per uno schema)** (`table`) | testo | vuoto | La tabella in cui inserire, quando l'ingresso **tabella** non ha un valore. `schema.tabella` indica uno schema. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 32 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è una **colonna** della riga: si chiama **colonna 1**… e va **rinominato** con il nome della colonna, per esempio `nome`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire l'inserimento, anche se l'ingresso «lo avvia». L'inserimento parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**:

1. La riga è il valore di **riga**, se ne ha uno (non `null`); altrimenti l'oggetto fatto con gli ingressi aggiunti che hanno un valore.
2. Il blocco scrive `INSERT INTO tabella (colonne) VALUES (…)` con i valori come parametri e lo esegue.
3. Manda **righe inserite**, **ultimo id** e le righe restituite.

- **Più righe**: una lista di oggetti inserisce tutte le righe. Le colonne sono quelle della **prima** riga: una colonna che manca in un'altra riga vale `NULL`, una in più è ignorata. Al massimo tante righe quante le righe massime di un risultato del modulo (10000 di serie).
- **Statement divisi**: se le righe sono tante, vengono inserite in più istruzioni (per rispettare il numero massimo di parametri). Il blocco le mette insieme in una **transazione** (tutte o nessuna), a meno che tu sia già dentro una: collegando la **transazione** di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) è lei a decidere. Oracle inserisce una riga per istruzione. ClickHouse non ha transazioni: le istruzioni vanno una dopo l'altra, e se una fallisce le righe di quelle prima restano inserite.
- **ultimo id**: PostgreSQL, SQL Server e SQLite lo prendono dalla riga restituita (il **primo** campo dell'ultima riga: se la tua tabella non comincia con la colonna chiave, usa l'uscita **righe inserite** nascosta); MySQL e MariaDB danno il numero `AUTO_INCREMENT`; Oracle e ClickHouse non lo danno.
- **Nomi**: tabella e colonne (lettere, cifre e `_`, al massimo 63 caratteri) sono controllati e messi tra virgolette per il database. Su Oracle un nome tutto minuscolo viene scritto maiuscolo.
- **Valori**: `null` è `NULL`. Oggetti e liste diventano testo JSON (PostgreSQL li dà come JSON); `{ "$bytes": "base64" }` diventa binario; un testo ISO è una data dove il database la accetta. Vedi [Blocchi database (SQL)](logicstudio-db).

## Esempi

### 1. Salvare una riga da un modulo

Aggiungi gli ingressi `nome` e `email`. **Tabella** `iscritti`.

```
[Campo di testo: nome]  testo ──▶ nome  [SQL · Inserisci (INSERT)] righe inserite ──▶ valore [Print (console.log)]
[Campo di testo: email] testo ──▶ email                           ultimo id ──▶ valore [Valore: numero iscritto]
[SQL · PostgreSQL (connect)] connessione ──▶ connessione
[Pulsante: Iscrivi] premuto ──▶ esegui
```

Premendo **Iscrivi** il database riceve `INSERT INTO "iscritti" ("nome", "email") VALUES ($1, $2) RETURNING *`. **ultimo id** è il numero dato alla riga.

### 2. Registrare un oggetto con il tempo

```
[Now (data e ora)] ISO ──▶ quando [Oggetto { }] oggetto ──▶ riga [SQL · Inserisci (INSERT): misure]
[Campo numerico: valore] valore ──▶ valore
[SQL · SQLite (open)] connessione ──▶ connessione
[Intervallo (setInterval): 60 s] impulso ──▶ esegui
```

[Oggetto { }](core.compose) prepara `{ "quando": "2026-11-11T10:05:00.000Z", "valore": 22.5 }`; con l'ingresso **riga** non serve aggiungere ingressi.

### 3. Molte righe, tutte o nessuna

```
[SQL · SQL Server (connect)] connessione ──▶ connessione [SQL · Inserisci (INSERT): righe_ordine] righe inserite ──▶ valore [Valore: inserite]
[Lista [ ]: l'elenco delle righe] lista ──▶ riga
[Pulsante: Salva] premuto ──▶ esegui
```

Le 500 righe della lista entrano in una sola operazione: se una sola riga è rifiutata, nessuna viene inserita.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una riga { colonna: valore } o una lista di righe | **riga** non è un oggetto né una lista di oggetti, o la lista è vuota. |
| Troppe righe in una volta (al massimo 10000) | La lista ha più righe del massimo del modulo. |
| La riga da inserire non ha colonne | L'oggetto è vuoto (e non ci sono ingressi aggiunti con un valore). |
| Manca il nome della tabella | **Tabella** è vuota. |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | Il nome ha simboli o spazi. |
| Colonna non valida: «…» (lettere, cifre e _) | Il nome di una colonna non è valido. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Il database è aperto in sola lettura | (SQLite) Il database è aperto con **Sola lettura**. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| … (un messaggio del database) | Una regola del database non è rispettata (chiave doppia, valore mancante, tipo sbagliato…). |

## Vedi anche

- [SQL · Aggiorna (UPDATE)](db.update), [SQL · Elimina (DELETE)](db.delete), [SQL · Leggi tabella (SELECT)](db.select)
- [SQL · Query (query)](db.query), per un inserimento scritto a mano
- [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction), per più scritture insieme
- [Oggetto { }](core.compose), per preparare la riga
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
