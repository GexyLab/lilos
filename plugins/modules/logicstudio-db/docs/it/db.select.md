# SQL · Leggi tabella (SELECT)

`db.select` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Legge le righe di una tabella **senza scrivere SQL**: scegli la tabella, le colonne, l'ordine e quante righe; le condizioni sono gli ingressi aggiunti, uno per colonna (`colonna = valore`). I nomi sono controllati e messi tra virgolette per quel database, e i valori passano a parte, come parametri.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la lettura. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione (o di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)). Non avvia il blocco. |
| **tabella** (`table`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Tabella** delle impostazioni. Non avvia il blocco. |
| **condizioni** (`where`) | oggetto | Nascosta. Un oggetto `{ "colonna": valore }` con altre condizioni, insieme a quelle degli ingressi aggiunti (se una colonna c'è in tutti e due, vale l'ingresso aggiunto). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | lista | Le righe lette, ognuna un oggetto `{ "colonna": valore }`. |
| **prima riga** (`first`) | oggetto | La prima riga, oppure `null` se non ce ne sono. |
| **altre righe** (`truncated`) | sì/no | Nascosta. `true` se la tabella ha altre righe oltre a quelle lette (cioè oltre il **Righe al massimo**). |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, nome non valido, tabella che non c'è, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tabella (schema.tabella per uno schema)** (`table`) | testo | vuoto | La tabella (o vista) da leggere, quando l'ingresso **tabella** non ha un valore. `schema.tabella` indica uno schema; fino a tre parti. |
| **Colonne (a, b, c oppure *)** (`columns`) | testo | `*` | Le colonne da leggere, separate da virgole. `*`: tutte. |
| **Ordine (colonna oppure colonna DESC)** (`order`) | testo | vuoto | Come ordinare: una colonna, `colonna DESC` per il contrario, o più separate da virgole (`cliente, totale DESC`). Vuoto: nessun ordine (quello del database). |
| **Righe al massimo (0 = il limite del modulo)** (`limit`) | da 0 a 1000000 | 100 | Quante righe leggere al massimo. 0: il limite delle impostazioni del modulo (10000 di serie). Non può superare quel limite. |
| **Salta righe** (`offset`) | numero da 0 | 0 | Quante righe saltare all'inizio, per leggere a pagine. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è una **condizione**: si chiama **condizione (colonna) 1**… e va **rinominato** con il nome della colonna, per esempio `cliente`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la lettura, anche se l'ingresso «lo avvia». La lettura parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco mette insieme `SELECT colonne FROM tabella WHERE condizioni ORDER BY ordine LIMIT … OFFSET …` (nella forma del database: `TOP`, `FETCH NEXT`…) e lo esegue con i valori come parametri.

- **Condizioni**: ogni colonna con un valore è una condizione `colonna = valore`; tutte insieme con **AND**. Un ingresso aggiunto che non ha (ancora) ricevuto un valore non conta. Un valore `null` diventa `colonna IS NULL`. Una **lista** diventa `colonna IN (…)` (con la lista vuota, nessuna riga). Senza nessuna condizione si leggono tutte le righe (fino al limite).
- **Nomi**: la tabella, ogni colonna e le colonne dell'ordine devono essere fatte di lettere, cifre e `_` (che comincia con una lettera o `_`, al massimo 63 caratteri); la tabella può avere lo schema (`schema.tabella`). Niente espressioni, funzioni o alias: per quelli usa [SQL · Query (query)](db.query).
- **Limite**: il blocco chiede una riga in più del limite per sapere se ce ne sono altre: con più righe, **altre righe** è `true`. Il limite non supera mai le righe massime delle impostazioni del modulo, né la dimensione massima del risultato.
- **Ordine**: senza ordine l'ordine delle righe lo sceglie il database e può cambiare. Se leggi a pagine con **Salta righe**, scegli sempre un ordine (SQL Server, senza, usa un ordine qualunque).
- Su Oracle un nome tutto minuscolo viene scritto maiuscolo, come in SQL (`ordini` è la tabella `ORDINI`); le colonne escono in maiuscolo.

## Esempi

### 1. Gli ultimi ordini di un cliente

**Tabella** `ordini`, **Ordine** `id DESC`, **Righe al massimo** 20. Aggiungi un ingresso e chiamalo `cliente`.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Leggi tabella (SELECT)] righe ──▶ righe [Tabella]
[Selezione: cliente] valore ──▶ cliente
[Pulsante: Mostra] premuto ──▶ esegui
```

La lettura è `SELECT * FROM "ordini" WHERE "cliente" = $1 ORDER BY "id" DESC LIMIT 20`.

### 2. Leggere a pagine

**Tabella** `articoli`, **Ordine** `codice`, **Righe al massimo** 50. **Salta righe** si sceglie nelle impostazioni.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Leggi tabella (SELECT)] righe ──▶ righe [Tabella]
                                                                    altre righe ──▶ valore [Spia: ci sono altre pagine]
[Pulsante: Leggi] premuto ──▶ esegui
```

Se **altre righe** è `true`, ci sono più di 50 articoli: la [Spia](ui.lamp) si accende.

### 3. Trovare più clienti in una volta

```
[SQL · MySQL · MariaDB (connect)] connessione ──▶ connessione [SQL · Leggi tabella (SELECT): clienti] righe ──▶ righe [Tabella]
[Lista [ ]: ["Roma", "Milano"]] lista ──▶ citta (ingresso aggiunto)
[Pulsante: Cerca] premuto ──▶ esegui
```

Una lista diventa una condizione `IN (?, ?)` sulla colonna `citta`: i clienti di Roma o Milano.

## Errori

| Messaggio | Quando |
|---|---|
| Manca il nome della tabella | **Tabella** è vuota (e l'ingresso **tabella** non ha un valore). |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | Il nome ha simboli o spazi, o più di tre parti. |
| Colonna non valida: «…» (lettere, cifre e _) | Una colonna delle **Colonne**, un ingresso aggiunto o una chiave di **condizioni** non è un nome valido. |
| Ordine non valido: «…» (colonna oppure colonna DESC) | L'**Ordine** non è nella forma `colonna` o `colonna DESC`. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | La lettura ha superato il tempo massimo. |
| … (un messaggio del database) | La tabella o una colonna non esistono, o non hai il permesso di leggerle. |

## Vedi anche

- [SQL · Query (query)](db.query), per l'SQL scritto a mano
- [SQL · Inserisci (INSERT)](db.insert), [SQL · Aggiorna (UPDATE)](db.update), [SQL · Elimina (DELETE)](db.delete)
- [SQL · Tabelle e colonne (schema)](db.tables), per vedere quali tabelle e colonne ci sono
- [SQL · Scorri righe (cursor)](db.cursor), per le tabelle molto grandi
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
