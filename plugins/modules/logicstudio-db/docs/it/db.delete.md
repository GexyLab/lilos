# SQL · Elimina (DELETE)

`db.delete` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Cancella le righe di una tabella che rispettano le condizioni, **senza scrivere SQL**. Le condizioni sono gli ingressi aggiunti, uno per colonna (`colonna = valore`). Senza condizioni il blocco non cancella niente, a meno che tu spunti **Tutte le righe**: così un ingresso dimenticato non svuota la tabella.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la cancellazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione (o di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)). Non avvia il blocco. |
| **tabella** (`table`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Tabella** delle impostazioni. Non avvia il blocco. |
| **condizioni** (`where`) | oggetto | Nascosta. Un oggetto `{ "colonna": valore }` con altre condizioni, insieme a quelle degli ingressi aggiunti (se una colonna c'è in tutti e due, vale l'ingresso aggiunto). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe cancellate** (`affected`) | numero | Quante righe sono state cancellate. |
| **Exception** (`error`) | oggetto | Quando la cancellazione non riesce: nessuna condizione, nome non valido, righe che altre tabelle ancora usano, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tabella (schema.tabella per uno schema)** (`table`) | testo | vuoto | La tabella da cui cancellare, quando l'ingresso **tabella** non ha un valore. |
| **Tutte le righe (quando non c'è una condizione)** (`all`) | sì / no | no | Se è spuntato, senza condizioni cancella **tutte** le righe della tabella. Se no, senza condizioni dà errore. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è una **condizione**: si chiama **condizione (colonna) 1**… e va **rinominato** con il nome della colonna, per esempio `id`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la cancellazione, anche se l'ingresso «lo avvia». La cancellazione parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco scrive `DELETE FROM tabella WHERE condizioni` e lo esegue, con i valori come parametri.

- **Condizioni**: come in [SQL · Leggi tabella (SELECT)](db.select): `colonna = valore`, tutte con **AND**; `null` diventa `IS NULL`; una lista diventa `IN (…)` (una lista vuota non trova righe). Un ingresso che non ha ancora ricevuto un valore non conta.
- **Senza condizioni** il blocco dà errore, a meno che **Tutte le righe** sia spuntato: allora cancella ogni riga (la tabella resta, vuota).
- **Nomi**: tabella e colonne (lettere, cifre e `_`, al massimo 63 caratteri) sono controllati e messi tra virgolette per il database. Su Oracle un nome tutto minuscolo viene scritto maiuscolo.
- Se nessuna riga rispetta le condizioni, **righe cancellate** è 0 e non è un errore.
- Una cancellazione non si annulla: provala prima su dati di prova, oppure mettila in una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) e conferma solo se il numero di righe è quello atteso. ClickHouse non ha transazioni e accetta `DELETE FROM` solo in certe versioni.

## Esempi

### 1. Cancellare un ordine

**Tabella** `ordini`. Aggiungi un ingresso e chiamalo `id`.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Elimina (DELETE)] righe cancellate ──▶ valore [Print (console.log)]
[Campo numerico: id] valore ──▶ id
[Pulsante: Cancella] premuto ──▶ esegui
```

Con `id` = 7 il database riceve `DELETE FROM "ordini" WHERE "id" = $1`.

### 2. Svuotare una tabella di appoggio

**Tabella** `temporanea`, **Tutte le righe** spuntato, nessun ingresso aggiunto.

```
[All'avvio (main)] impulso ──▶ esegui [SQL · Elimina (DELETE)] righe cancellate ──▶ valore [Print (console.log)]
[SQL · SQLite (open)] connessione ──▶ connessione
```

Ogni volta che il programma parte, la tabella `temporanea` si svuota.

### 3. Cancellare solo se la regola dice di sì

```
[SQL · Elimina (DELETE)] righe cancellate ──▶ a [Confronto (== ≠ < >): a = b] se falso ──▶ invia [Notify: "Ne ho cancellate più del previsto"]
                                                [Costante · Variabile: 1] valore ──▶ b
```

Per essere sicuro di cancellarne una sola, controlla **righe cancellate**: se non è 1, avvisa. Per annullare davvero, fai la cancellazione dentro una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) e usa **annulla**.

## Errori

| Messaggio | Quando |
|---|---|
| Nessuna condizione: si cancellerebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe» | Non c'è nessuna condizione e **Tutte le righe** non è spuntato. |
| Manca il nome della tabella | **Tabella** è vuota. |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | Il nome ha simboli o spazi. |
| Colonna non valida: «…» (lettere, cifre e _) | Una colonna delle condizioni non è un nome valido. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Il database è aperto in sola lettura | (SQLite) Il database è aperto con **Sola lettura**. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| … (un messaggio del database) | Una regola del database lo impedisce (per esempio una chiave esterna). |

## Vedi anche

- [SQL · Inserisci (INSERT)](db.insert), [SQL · Aggiorna (UPDATE)](db.update), [SQL · Leggi tabella (SELECT)](db.select)
- [SQL · Query (query)](db.query), per una cancellazione scritta a mano
- [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
