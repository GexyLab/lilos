# MongoDB · Aggrega (aggregate)

`mongo.aggregate` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Esegue una **pipeline di aggregazione**: una lista di passi (`$match`, `$group`, `$sort`, `$lookup`…) che filtra, raggruppa e calcola, e manda i documenti del risultato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |
| **pipeline** (`pipeline`) | lista | La lista dei passi. Se ha un valore non vuoto, prende il posto della **Pipeline** delle impostazioni. Può essere anche un testo che contiene il JSON. Non avvia il blocco. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **documenti** (`documents`) | lista | I documenti del risultato, ognuno un oggetto in Extended JSON. |
| **primo** (`first`) | oggetto | Nascosta. Il primo documento, oppure `null` se non ce ne sono. |
| **quanti** (`count`) | numero | Quanti documenti sono usciti. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se il risultato aveva più documenti del limite del modulo (10000 di serie) e gli altri non sono usciti. |
| **Exception** (`error`) | oggetto | Quando l'aggregazione non riesce: connessione mancante o chiusa, pipeline non valida, passo sbagliato per il server, tempo scaduto, risultato troppo grande… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |
| **Pipeline (lista JSON di passi)** (`pipeline`) | JSON | `[]` | La lista dei passi, per esempio `[{"$match": {"stato": "nuovo"}}, {"$group": {"_id": "$cliente", "totale": {"$sum": "$importo"}}}]`. Vuota: `[]`, che dà tutti i documenti. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiama `aggregate(pipeline)` sulla raccolta.

- **La pipeline** è una lista di oggetti, uno per passo: `[{"$match": {…}}, {"$group": {…}}, {"$sort": {"totale": -1}}]`. La lista sull'ingresso **pipeline** (se ha un valore non vuoto) vince su quella delle impostazioni. Si può scrivere anche «da shell», con `ISODate("…")` e `ObjectId("…")`.
- I valori sono Extended JSON, come nei filtri: `{"$date": "…"}` è una data, `{"$oid": "…"}` un ObjectId; nei risultati lo stesso.
- Il blocco **non toglie né cambia** nessun passo: quello che la pipeline può fare dipende dai permessi dell'utente del database. Un passo `$out` o `$merge` scrive in una raccolta; usalo solo se vuoi quello.
- L'aggregazione non usa il disco del server (`allowDiskUse` è falso) e ha il tempo massimo di un'operazione anche sul server: un passo `$group` o `$sort` troppo grande si ferma con un errore del server.
- **Limite**: come in [MongoDB · Trova (find)](mongo.find), al massimo i documenti del limite del modulo (10000 di serie); se ce ne sono di più, **troncato** è `true`. Anche la dimensione massima del risultato (4096 KB di serie) vale.
- Il nome della raccolta serve anche qui. Le pipeline che non partono da una raccolta (`$documents`, `$currentOp`) non si possono usare.

## Esempi

### 1. Il totale per cliente

**Raccolta** `ordini`, **Pipeline**:

```
[{"$match": {"stato": "pagato"}}, {"$group": {"_id": "$cliente", "totale": {"$sum": "$importo"}}}, {"$sort": {"totale": -1}}, {"$limit": 10}]
```

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Aggrega (aggregate)] documenti ──▶ righe [Tabella]
[Pulsante: Classifica] premuto ────────────────────────────────▶ esegui
```

La [Tabella](ui.table) mostra i 10 clienti che hanno speso di più: una colonna `_id` (il cliente) e una `totale`.

### 2. Una pipeline calcolata dal programma

**Template (formatta)**: `[{"$match": {"stato": "{a}"}}, {"$count": "quanti"}]`.

```
[Campo di testo: stato] testo ──▶ a [Template (formatta)] testo ──▶ pipeline [MongoDB · Aggrega (aggregate): ordini] primo ──▶ valore [Print (console.log)]
[Pulsante: Conta] premuto ──▶ esegui
```

[Template (formatta)](core.format) mette lo stato scelto nel testo della pipeline; il blocco accetta anche un testo con il JSON su **pipeline**. Attenzione: il valore finisce dentro il JSON, quindi usa un campo di cui ti fidi (un `"` nel testo lo rovinerebbe: compare l'errore «Pipeline non valida»).

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server MongoDB sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Manca il nome della raccolta (collection) | **Raccolta** è vuota e l'ingresso **raccolta** non ha un valore. |
| Nome della raccolta non valido: … | Il nome è più lungo di 200 caratteri o contiene `$`. |
| Pipeline non valida: scrivi un JSON, per esempio … (…) | La pipeline è un testo che non è JSON. |
| Pipeline non valida: serve una lista di passi [{ "$match": … }, { "$group": … }] | Non è una lista, o contiene qualcosa che non è un oggetto. |
| Pipeline: testo troppo lungo (al massimo 1024 KB) | La pipeline scritta come testo supera 1 MB. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. Aggiungi un `$limit` o un `$project`. |
| MongoDB non ha risposto in 30 s | L'aggregazione ha superato il tempo massimo di un'operazione. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Trova (find)](mongo.find), per le letture semplici
- [MongoDB · Conta (countDocuments)](mongo.count)
- [Tabella](ui.table), per mostrare il risultato
- [Lista [ ]](core.list), [Oggetto { }](core.compose), per preparare i passi
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
