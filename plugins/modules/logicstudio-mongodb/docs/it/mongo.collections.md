# MongoDB · Raccolte (listCollections)

`mongo.collections` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Elenca le **raccolte** del database della connessione: i nomi, e di che tipo sono (raccolta, vista…). Utile per scegliere una raccolta in una [Selezione](ui.select) o per controllare che esista.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **nomi** (`names`) | lista | I nomi delle raccolte, in ordine alfabetico, come lista di testi. |
| **raccolte** (`collections`) | lista | Nascosta. Le raccolte come oggetti: `{ "name": "ordini", "type": "collection" }` (il tipo può essere anche `view` o `timeseries`). |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se le raccolte sono più del limite del modulo (10000 di serie) e le altre non sono uscite. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, permesso negato, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

Questo blocco non ha impostazioni.

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede a MongoDB l'elenco delle raccolte del database che hai scelto nella connessione (solo quelle che l'utente può vedere). Questo blocco non ha impostazioni: il database è quello del blocco di connessione.

## Esempi

### 1. Scegliere la raccolta da una selezione

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Raccolte (listCollections)] nomi ──▶ opzioni [Selezione: raccolta]
                                      connesso ──▶ esegui
```

Appena la connessione è pronta, la [Selezione](ui.select) si riempie con i nomi delle raccolte. Il nome scelto (uscita **valore**) può andare all'ingresso nascosto **raccolta** di [MongoDB · Trova (find)](mongo.find).

### 2. Un elenco con i tipi

```
[MongoDB · Raccolte (listCollections)] raccolte ──▶ righe [Tabella]
```

L'uscita nascosta **raccolte** ha un oggetto per raccolta (`name` e `type`): la [Tabella](ui.table) mostra le due colonne e fa vedere subito quali sono viste.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server MongoDB sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Permesso negato dal database: … | L'utente non può elencare le raccolte del database. |
| MongoDB non ha risposto in 30 s | L'elenco ha superato il tempo massimo di un'operazione. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | L'elenco supera la dimensione massima di un risultato. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Connessione (MongoClient)](mongo.connect), per scegliere il database
- [MongoDB · Trova (find)](mongo.find)
- [Selezione](ui.select), per scegliere un nome
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
