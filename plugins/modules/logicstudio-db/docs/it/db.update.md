# SQL · Aggiorna (UPDATE)

`db.update` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Cambia le colonne di **valori** nelle righe di una tabella che rispettano le condizioni, **senza scrivere SQL**. Le condizioni sono gli ingressi aggiunti, uno per colonna (`colonna = valore`). Senza condizioni il blocco non fa niente, a meno che tu spunti **Tutte le righe**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'aggiornamento. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione (o di una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)). Non avvia il blocco. |
| **valori** (`values`) | oggetto | Un oggetto `{ "colonna": nuovo valore }` con le colonne da cambiare. Non avvia il blocco. |
| **tabella** (`table`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Tabella** delle impostazioni. Non avvia il blocco. |
| **condizioni** (`where`) | oggetto | Nascosta. Un oggetto `{ "colonna": valore }` con altre condizioni, insieme a quelle degli ingressi aggiunti (se una colonna c'è in tutti e due, vale l'ingresso aggiunto). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe modificate** (`affected`) | numero | Quante righe sono state cambiate (per MySQL e MariaDB, quelle che hanno trovato le condizioni). |
| **Exception** (`error`) | oggetto | Quando l'aggiornamento non riesce: niente da cambiare, nessuna condizione, nome non valido, valore non accettato, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tabella (schema.tabella per uno schema)** (`table`) | testo | vuoto | La tabella da aggiornare, quando l'ingresso **tabella** non ha un valore. |
| **Tutte le righe (quando non c'è una condizione)** (`all`) | sì / no | no | Se è spuntato, senza condizioni cambia **tutte** le righe della tabella. Se no, senza condizioni dà errore. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è una **condizione**: si chiama **condizione (colonna) 1**… e va **rinominato** con il nome della colonna, per esempio `id`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire l'aggiornamento, anche se l'ingresso «lo avvia». L'aggiornamento parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco scrive `UPDATE tabella SET colonna = valore, … WHERE condizioni` e lo esegue, con tutti i valori come parametri.

- **Valori**: ogni chiave di **valori** è una colonna da cambiare; `null` la svuota (`NULL`). Un oggetto vuoto o un ingresso senza un valore dà «Niente da cambiare».
- **Condizioni**: come in [SQL · Leggi tabella (SELECT)](db.select): `colonna = valore`, tutte con **AND**; `null` diventa `IS NULL`; una lista diventa `IN (…)` (una lista vuota non trova righe). Un ingresso che non ha ancora ricevuto un valore non conta: **attenzione**, se per errore nessun ingresso ha un valore, le condizioni sono vuote e il blocco si ferma con l'errore (a meno di **Tutte le righe**).
- **Tutte le righe**: spuntala solo se vuoi davvero cambiare ogni riga; con le condizioni presenti non ha effetto.
- **Nomi**: tabella e colonne (lettere, cifre e `_`, al massimo 63 caratteri) sono controllati e messi tra virgolette per il database. Su Oracle un nome tutto minuscolo viene scritto maiuscolo.
- **Righe modificate**: se nessuna riga rispetta le condizioni, è 0 e non è un errore.
- ClickHouse accetta `UPDATE … SET` solo in certe versioni: vedi [SQL · ClickHouse (connect)](db.clickhouse).

## Esempi

### 1. Cambiare lo stato di un ordine

**Tabella** `ordini`. Aggiungi un ingresso e chiamalo `id`.

```
[Oggetto { }: { "stato": "spedito" }] oggetto ──▶ valori [SQL · Aggiorna (UPDATE)] righe modificate ──▶ valore [Print (console.log)]
[Campo numerico: id] valore ──▶ id
[SQL · PostgreSQL (connect)] connessione ──▶ connessione
[Pulsante: Spedisci] premuto ──▶ esegui
```

Con `id` = 7 il database riceve `UPDATE "ordini" SET "stato" = $1 WHERE "id" = $2`.

### 2. Cambiare più righe con una lista

```
[Lista [ ]: [3, 5, 8]] lista ──▶ id (ingresso aggiunto) [SQL · Aggiorna (UPDATE): articoli]
[Oggetto { }: { "attivo": 0 }] oggetto ──▶ valori
[SQL · SQLite (open)] connessione ──▶ connessione
```

La condizione è `"id" IN (?, ?, ?)`: si disattivano i tre articoli.

### 3. Dentro una transazione

```
[SQL · Transazione (BEGIN · COMMIT · ROLLBACK)] transazione ──▶ connessione [SQL · Aggiorna (UPDATE): conti]
                                                transazione ──▶ connessione [SQL · Aggiorna (UPDATE): conti]
```

Due aggiornamenti (un conto che scende, uno che sale) stanno nella stessa transazione: vedi [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction).

## Errori

| Messaggio | Quando |
|---|---|
| Niente da cambiare: serve un oggetto { colonna: valore } in «valori» | **valori** è vuoto o non è un oggetto. |
| Nessuna condizione: si cambierebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe» | Non c'è nessuna condizione e **Tutte le righe** non è spuntato. |
| Manca il nome della tabella | **Tabella** è vuota. |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | Il nome ha simboli o spazi. |
| Colonna non valida: «…» (lettere, cifre e _) | Una colonna di **valori** o delle condizioni non è un nome valido. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Il database è aperto in sola lettura | (SQLite) Il database è aperto con **Sola lettura**. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| … (un messaggio del database) | Una regola del database non è rispettata. |

## Vedi anche

- [SQL · Inserisci (INSERT)](db.insert), [SQL · Elimina (DELETE)](db.delete), [SQL · Leggi tabella (SELECT)](db.select)
- [SQL · Query (query)](db.query), per un aggiornamento scritto a mano (condizioni diverse da «uguale»)
- [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
