# MongoDB · Trova (find)

`mongo.find` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Legge i documenti di una raccolta che corrispondono al **filtro**, con i campi, l'ordine e il numero che vuoi. Ogni ingresso aggiunto è un campo del filtro: per i casi semplici non serve scrivere JSON.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |
| **filtro** (`filter`) | oggetto | Un oggetto filtro, per esempio `{"stato": "nuovo"}`. Se ha un valore non vuoto, prende il posto del **Filtro** delle impostazioni. Non avvia il blocco. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |
| **limite** (`limit`) | numero | Nascosta. Se ha un valore non vuoto, prende il posto di **Al massimo (limit)**. Non avvia il blocco. |
| **salta** (`skip`) | numero | Nascosta. Se ha un valore non vuoto, prende il posto di **Salta (skip)**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **documenti** (`documents`) | lista | I documenti letti, ognuno un oggetto in Extended JSON. |
| **primo** (`first`) | oggetto | Nascosta. Il primo documento, oppure `null` se non ce ne sono. |
| **quanti** (`count`) | numero | Quanti documenti sono usciti (non quanti ne ha la raccolta: per quello c'è [MongoDB · Conta (countDocuments)](mongo.count)). |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se ci sono altri documenti oltre il limite del modulo (10000 di serie) e non sono usciti. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, filtro non valido, nome della raccolta non valido, tempo scaduto, risultato troppo grande… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo del filtro**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato` o `cliente.citta`. Il filtro diventa `{"stato": valore}`: uguaglianza.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire il blocco, anche se l'ingresso «lo avvia». Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |
| **Filtro (JSON, vuoto = tutti i documenti)** (`filter`) | JSON | vuoto | Il filtro, quando l'ingresso **filtro** non ha un valore. Vuoto: tutti i documenti. Si può scrivere anche come nella shell di MongoDB (vedi sotto). |
| **Campi (projection, per esempio {"nome": 1})** (`projection`) | JSON | vuoto | Quali campi far uscire: `{"nome": 1, "eta": 1}` solo quelli (e `_id`), `{"nome": 0}` tutti tranne quello. Vuoto: tutti. |
| **Ordine (sort, per esempio {"eta": -1})** (`sort`) | JSON | vuoto | Come ordinare: `1` dal più piccolo, `-1` dal più grande; più campi nell'ordine in cui sono scritti. Vuoto: l'ordine del database. |
| **Al massimo (limit, 0 = fino al limite del modulo)** (`limit`) | numero da 0 | 0 | Quanti documenti leggere al massimo. 0: il limite del modulo (10000 di serie). Non può superare quel limite. |
| **Salta (skip)** (`skip`) | numero da 0 | 0 | Quanti documenti saltare all'inizio, per leggere a pagine. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede al database i documenti con `find(filtro, projection, sort, skip, limit)`.

### Il filtro

- Il filtro è un oggetto JSON nel formato di MongoDB: `{"stato": "nuovo", "eta": {"$gt": 30}}`. Vedi la pagina [Blocchi MongoDB](logicstudio-mongodb) per i valori (ObjectId, date) e per la scrittura «da shell».
- L'ingresso **filtro** (se ha un valore non vuoto) vince sul **Filtro** delle impostazioni. Può essere un oggetto o un testo che contiene il JSON.
- Ogni **ingresso aggiunto** con un valore diventa `campo = valore` e si somma al filtro (se il campo c'è già, vale l'ingresso aggiunto). Un ingresso aggiunto che non ha ancora ricevuto un valore non conta. Un valore `null` cerca i documenti dove il campo è `null` o manca.
- Un ingresso aggiunto chiamato `_id` con un testo di 24 cifre esadecimali trova sia l'**ObjectId** sia il testo uguale.
- Un testo resta un testo; un oggetto è letto come Extended JSON: `{"$oid": "…"}` è un ObjectId, `{"$date": "…"}` una data.
- Il nome di un ingresso aggiunto non può cominciare con `$` né superare 200 caratteri.

### Il risultato

- I documenti escono come **Extended JSON (relaxed)**: un ObjectId è `{"$oid": "…"}`, una data `{"$date": "…"}`, i numeri e i testi restano tali. Per leggere un campo di un documento c'è [Get proprietà (obj.campo)](core.get).
- **Limite**: il blocco chiede un documento in più del limite per sapere se ce ne sono altri: se ce ne sono, **troncato** è `true`. Con **Al massimo** più basso del limite del modulo non c'è mai **troncato**: hai chiesto proprio quel numero.
- Il limite del modulo (10000 documenti) e la dimensione massima del risultato (4096 KB di serie) valgono sempre: un risultato più grande dà errore («Risultato troppo grande»). Chiedi meno documenti, o meno campi con **Campi (projection)**.
- Senza **Ordine** i documenti escono nell'ordine che sceglie il database, che può cambiare. Se leggi a pagine con **Salta**, scegli sempre un ordine.
- Le uscite arrivano nell'ordine **documenti**, **primo**, **quanti**, **troncato**.

## Esempi

### 1. Gli ordini in una tabella

**Raccolta** `ordini`, **Ordine** `{"totale": -1}`, **Al massimo** 50.

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Trova (find)] documenti ──▶ righe [Tabella]
[Pulsante: Aggiorna] premuto ───────────────────────────────────▶ esegui
```

All'avvio il programma si collega; ogni volta che premi **Aggiorna** il blocco rilegge i 50 ordini più grandi e la [Tabella](ui.table) li mostra.

### 2. Cercare per uno o più campi

**Raccolta** `ordini`. Aggiungi due ingressi e chiamali `stato` e `cliente.citta`.

```
[Campo di testo: stato]  testo ──▶ stato          [MongoDB · Trova (find)] primo ──▶ valore [Valore]
[Campo di testo: citta]  testo ──▶ cliente.citta                           quanti ──▶ valore [Valore: trovati]
[Pulsante: Cerca] premuto ──────▶ esegui
```

Con `stato` = `nuovo` e `cliente.citta` = `Milano` il filtro è `{"stato": "nuovo", "cliente.citta": "Milano"}`. Un campo di testo ancora vuoto manda il testo vuoto, che è un valore: se vuoi ignorarlo, non collegarlo.

### 3. Un filtro con una data

**Filtro** `{"creato": {"$gte": ISODate("2026-11-01")}, "stato": {"$in": ["nuovo", "aperto"]}}`.

Il filtro scritto «da shell» (`ISODate`, chiavi senza virgolette sono accettate) diventa il JSON `{"creato": {"$gte": {"$date": "2026-11-01T00:00:00Z"}}, …}`. Per cercare un documento per `_id` aggiungi un ingresso chiamato `_id` e mandagli il testo di 24 cifre: trova l'ObjectId.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server MongoDB sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Manca il nome della raccolta (collection) | **Raccolta** è vuota e l'ingresso **raccolta** non ha un valore. |
| Nome della raccolta non valido: … | Il nome è più lungo di 200 caratteri o contiene `$`. |
| Filtro non valido: scrivi un JSON, per esempio {"nome": "Anna", "eta": {"$gt": 30}} (…) | Il filtro non è JSON (né scritto come nella shell). Dopo ci sono i dettagli. |
| Filtro non valido: serve un oggetto JSON { … } | Il filtro è JSON ma non un oggetto (per esempio una lista). |
| Filtro: testo troppo lungo (al massimo 1024 KB) | Il filtro scritto come testo supera 1 MB. |
| Campo del filtro non valido: … | Un ingresso aggiunto ha il nome vuoto, che comincia con `$` o più lungo di 200 caratteri. |
| Proiezione non valida: … / Ordine non valido: … | **Campi (projection)** o **Ordine (sort)** non è un oggetto JSON (lo stesso messaggio del filtro, con «Proiezione» o «Ordine» al posto di «Filtro»). |
| Numero non valido: … | **Al massimo** o **Salta** non è un numero intero da 0. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | I documenti letti superano la dimensione massima del risultato. |
| MongoDB non ha risposto in 30 s | La lettura ha superato il tempo massimo di un'operazione. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Conta (countDocuments)](mongo.count), per sapere quanti sono
- [MongoDB · Aggrega (aggregate)](mongo.aggregate), per raggruppare e calcolare
- [Get proprietà (obj.campo)](core.get), per leggere un campo di un documento
- [Tabella](ui.table), per mostrare i documenti
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
