# MongoDB · Aggiorna (updateOne · updateMany)

`mongo.update` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Cambia i documenti che corrispondono al **filtro**: `{"$set": {…}}`, `{"$inc": {…}}`… Un oggetto senza operatori è un `$set`. Ogni ingresso aggiunto è un campo del filtro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |
| **filtro** (`filter`) | oggetto | Un oggetto filtro, per esempio `{"stato": "nuovo"}`. Se ha un valore non vuoto, prende il posto del **Filtro** delle impostazioni. Non avvia il blocco. |
| **modifica** (`update`) | qualsiasi | La modifica: un oggetto con gli operatori (`{"$set": {"fatto": true}}`), un oggetto di soli campi (diventa un `$set`) o una lista di passi di aggregazione. Se ha un valore non vuoto, prende il posto della **Modifica** delle impostazioni. Non avvia il blocco. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **trovati** (`matched`) | numero | Quanti documenti corrispondevano al filtro. |
| **modificati** (`modified`) | numero | Quanti documenti sono stati davvero cambiati (un documento che aveva già quei valori è «trovato» ma non «modificato»). |
| **id inserito** (`upsertedId`) | qualsiasi | Nascosta. Con **upsert**, l'`_id` del documento inserito perché nessuno corrispondeva; altrimenti `null`. |
| **Exception** (`error`) | oggetto | Quando la modifica non riesce: connessione mancante o chiusa, filtro o modifica non validi, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo del filtro**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato` o `cliente.citta`. Il filtro diventa `{"stato": valore}`: uguaglianza.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire il blocco, anche se l'ingresso «lo avvia». Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |
| **Filtro (JSON, vuoto = tutti i documenti)** (`filter`) | JSON | vuoto | Il filtro, quando l'ingresso **filtro** non ha un valore. Vuoto: tutti i documenti. Si può scrivere anche come nella shell di MongoDB (vedi sotto). |
| **Modifica (JSON, per esempio {"$set": {"fatto": true}})** (`update`) | JSON | vuoto | La modifica, quando l'ingresso **modifica** non ha un valore. |
| **Documenti** (`many`) | Il primo che corrisponde (…One), Tutti quelli che corrispondono (…Many) | Il primo che corrisponde | Se il blocco agisce sul primo documento che corrisponde o su tutti. |
| **Inseriscilo se nessuno corrisponde (upsert)** (`upsert`) | sì / no | no | Se nessun documento corrisponde, ne crea uno nuovo dal filtro e dalla modifica. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiama `updateOne` (o `updateMany`, con **Documenti** «Tutti quelli che corrispondono») con il filtro e la modifica.

### Il filtro

- Il filtro è un oggetto JSON nel formato di MongoDB: `{"stato": "nuovo", "eta": {"$gt": 30}}`. Vedi la pagina [Blocchi MongoDB](logicstudio-mongodb) per i valori (ObjectId, date) e per la scrittura «da shell».
- L'ingresso **filtro** (se ha un valore non vuoto) vince sul **Filtro** delle impostazioni. Può essere un oggetto o un testo che contiene il JSON.
- Ogni **ingresso aggiunto** con un valore diventa `campo = valore` e si somma al filtro (se il campo c'è già, vale l'ingresso aggiunto). Un ingresso aggiunto che non ha ancora ricevuto un valore non conta. Un valore `null` cerca i documenti dove il campo è `null` o manca.
- Un ingresso aggiunto chiamato `_id` con un testo di 24 cifre esadecimali trova sia l'**ObjectId** sia il testo uguale.
- Un testo resta un testo; un oggetto è letto come Extended JSON: `{"$oid": "…"}` è un ObjectId, `{"$date": "…"}` una data.
- Il nome di un ingresso aggiunto non può cominciare con `$` né superare 200 caratteri.

### La modifica

- **Con operatori**: `{"$set": {"stato": "fatto"}, "$inc": {"tentativi": 1}}`. Gli operatori sono quelli di MongoDB (`$set`, `$unset`, `$inc`, `$push`, `$pull`, `$rename`…).
- **Senza operatori**: `{"stato": "fatto"}` diventa `{"$set": {"stato": "fatto"}}`. Meglio per i casi semplici.
- **Misto**: operatori e campi insieme (`{"$set": {…}, "stato": "x"}`) è un errore.
- **Una lista di passi** (`[{"$set": {…}}]`): è una modifica con una pipeline di aggregazione, che può usare i valori degli altri campi.
- Una modifica vuota è un errore: non c'è niente da cambiare.
- Come per il filtro, i valori sono Extended JSON (`{"$date": "…"}`, `{"$oid": "…"}`).

### Primo o tutti, e upsert

- **Il primo che corrisponde** cambia un solo documento, anche se ne corrispondono di più; **Tutti** li cambia tutti. Con il filtro vuoto, il primo documento della raccolta o tutti.
- Con **upsert**, se nessun documento corrisponde viene inserito un documento nuovo, fatto dai campi del filtro (uguaglianze) e dalla modifica; **id inserito** ne dà l'`_id`.
- Le uscite arrivano nell'ordine **trovati**, **modificati**, **id inserito**.

## Esempi

### 1. Segnare un ordine come spedito

**Raccolta** `ordini`, **Modifica** `{"stato": "spedito"}`. Aggiungi un ingresso chiamato `_id`.

```
[Tabella] riga scelta ──▶ oggetto [Get proprietà (obj.campo): _id.$oid] valore ──▶ _id [MongoDB · Aggiorna (updateOne · updateMany)] modificati ──▶ valore [Valore]
[Pulsante: Spedisci] premuto ───────────────────────────────────────────────────▶ esegui
```

L'`_id` è la parte `$oid` dell'ObjectId: un ingresso chiamato `_id` con quel testo di 24 cifre trova il documento. Il documento diventa `{"$set": {"stato": "spedito"}}`.

### 2. Un contatore con upsert

**Raccolta** `contatori`, **Modifica** `{"$inc": {"visite": 1}}`, **Documenti** «Il primo che corrisponde», **upsert** spuntato. Aggiungi un ingresso chiamato `pagina`.

```
[Campo di testo: pagina] testo ──▶ pagina [MongoDB · Aggiorna (updateOne · updateMany)] trovati ──▶ valore [Print (console.log)]
[Pulsante: Conta] premuto ──────────────▶ esegui
```

La prima volta per `home` nessun documento corrisponde: viene inserito `{"pagina": "home", "visite": 1}`. Dopo, ogni pressione aggiunge 1 a `visite`.

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
| Manca la modifica: per esempio {"$set": {"stato": "fatto"}} | **Modifica** è vuota e l'ingresso **modifica** non ha un valore. |
| Modifica non valida: scrivi un JSON, per esempio … (…) | La modifica è un testo che non è JSON. |
| Modifica vuota | La modifica è un oggetto senza campi. |
| Modifica non valida: usa solo operatori ($set, $inc…) oppure solo campi (diventano $set) | Operatori e campi nello stesso oggetto. |
| Modifica non valida: una pipeline è una lista di passi [{ "$set": … }] | La lista è vuota o contiene qualcosa che non è un oggetto. |
| Modifica non valida: serve un oggetto { "$set": … } | La modifica non è né un oggetto né una lista. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Inserisci (insertOne · insertMany)](mongo.insert), per aggiungere documenti
- [MongoDB · Elimina (deleteOne · deleteMany)](mongo.delete)
- [MongoDB · Trova (find)](mongo.find), per rileggere
- [Oggetto { }](core.compose), per preparare una modifica
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
