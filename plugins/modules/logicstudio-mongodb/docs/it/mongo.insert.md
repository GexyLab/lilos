# MongoDB · Inserisci (insertOne · insertMany)

`mongo.insert` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Inserisce un documento in una raccolta, oppure ognuno dei documenti di una lista. Ogni ingresso aggiunto è un campo del documento: puoi comporre il documento senza scrivere JSON.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |
| **documento o lista** (`document`) | qualsiasi | Un oggetto (un documento) o una lista di oggetti (più documenti). Può essere anche un testo che contiene il JSON. Non avvia il blocco. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **id** (`ids`) | lista | Gli `_id` dei documenti inseriti, nell'ordine (anche uno solo, in una lista). Un ObjectId esce come `{"$oid": "…"}`. |
| **primo id** (`id`) | qualsiasi | Nascosta. L'`_id` del primo documento inserito (`null` con una lista vuota). |
| **quanti** (`count`) | numero | Nascosta. Quanti documenti sono stati inseriti. |
| **Exception** (`error`) | oggetto | Quando l'inserimento non riesce: connessione mancante o chiusa, documento mancante o non valido, chiave duplicata, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo del documento**: si chiama **campo 1**… e va **rinominato** con il nome del campo, per esempio `cliente` o `totale`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire l'inserimento. Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco compone il documento e lo inserisce con `insertOne`; con una lista usa `insertMany`.

- **Il documento**: l'oggetto sull'ingresso **documento o lista**, più gli ingressi aggiunti che hanno un valore (se un campo c'è in tutti e due, vale l'ingresso aggiunto). Senza l'ingresso, il documento è fatto solo dagli ingressi aggiunti.
- **Una lista** di documenti: ognuno è inserito, **in ordine**, e se uno fallisce (chiave duplicata, per esempio) i successivi non vengono inseriti, mentre i precedenti restano. Con una lista **non servono ingressi aggiunti**: se ce ne sono con un valore, c'è un errore.
- Una lista vuota non inserisce niente e manda **id** vuota e **quanti** 0.
- **I valori**: un testo resta un testo, i numeri e i sì/no restano tali. Un oggetto è letto come Extended JSON: `{"$oid": "…"}` è un ObjectId, `{"$date": "…"}` una data (altrimenti una data resterebbe un testo). Un `{ "$bytes": "…" }` degli altri blocchi diventa un dato binario.
- Un documento senza `_id` ne riceve uno nuovo (un ObjectId), che esce su **id**.
- Si possono inserire al massimo tanti documenti per volta quanti sono i documenti massimi di un risultato (10000 di serie).

## Esempi

### 1. Salvare una misura

**Raccolta** `misure`. Aggiungi tre ingressi e chiamali `sensore`, `valore` e `quando`.

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [Now (data e ora)] ISO ──▶ quando [MongoDB · Inserisci (insertOne · insertMany)] id ──▶ valore [Print (console.log)]
                                 impulso ──▶ esegui
[Campo numerico: temperatura]    valore ──▶ valore
[Costante · Variabile: "serra"]  valore ──▶ sensore
```

L'impulso dell'[Intervallo (setInterval)](core.every) legge l'ora con [Now (data e ora)](core.now) e avvia il blocco su **esegui**; i valori arrivano agli ingressi aggiunti: ogni minuto un documento `{"sensore": "serra", "valore": 22.5, "quando": "2026-11-11T10:05:00.000Z"}`. Il campo `quando` è un testo; per salvare una data vera mandagli `{"$date": "2026-11-11T10:05:00.000Z"}` con [Oggetto { }](core.compose).

### 2. Importare una lista

```
[Pulsante: Importa] premuto ──▶ esegui [MongoDB · Inserisci (insertOne · insertMany): contatti] quanti ──▶ valore [Valore]
[Lista [ ]: oggetti] lista ──▶ documento o lista
```

Una lista di oggetti arriva su **documento o lista** e viene inserita con `insertMany`. Se un documento ha un `_id` già presente, quelli prima restano inseriti e dall'errore in poi no.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server MongoDB sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Manca il nome della raccolta (collection) | **Raccolta** è vuota e l'ingresso **raccolta** non ha un valore. |
| Nome della raccolta non valido: … | Il nome è più lungo di 200 caratteri o contiene `$`. |
| Manca il documento da inserire | **documento o lista** non ha un valore e non ci sono ingressi aggiunti con un valore. |
| Con una lista di documenti non servono ingressi aggiunti: mettili nei documenti | Arriva una lista e ci sono anche ingressi aggiunti con un valore. |
| Documento non valido: scrivi un JSON, per esempio {"nome": "Anna", "eta": {"$gt": 30}} (…) | Il testo sull'ingresso non è JSON. Dopo ci sono i dettagli. |
| Ogni documento deve essere un oggetto { … } | La lista contiene qualcosa che non è un oggetto (un numero, un testo, una lista). |
| Troppi documenti in una volta (al massimo 10000) | La lista ha più documenti del limite del modulo. |
| Documento: testo troppo lungo (al massimo 1024 KB) | Il documento scritto come testo supera 1 MB. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Aggiorna (updateOne · updateMany)](mongo.update), per cambiare un documento che c'è già (con **upsert** lo inserisce se manca)
- [MongoDB · Trova (find)](mongo.find), per rileggere i documenti
- [Oggetto { }](core.compose), per preparare un documento
- [Now (data e ora)](core.now), per l'ora di un campo
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
