# MongoDB · Elimina (deleteOne · deleteMany)

`mongo.delete` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Elimina i documenti che corrispondono al **filtro**. Con il filtro vuoto rifiuta di cancellare, a meno che tu non spunti **Tutti i documenti**. Ogni ingresso aggiunto è un campo del filtro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). Non avvia il blocco. |
| **filtro** (`filter`) | oggetto | Un oggetto filtro, per esempio `{"stato": "nuovo"}`. Se ha un valore non vuoto, prende il posto del **Filtro** delle impostazioni. Non avvia il blocco. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **eliminati** (`deleted`) | numero | Quanti documenti sono stati eliminati. |
| **Exception** (`error`) | oggetto | Quando l'eliminazione non riesce: connessione mancante o chiusa, filtro non valido, filtro vuoto senza «Tutti i documenti», tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo del filtro**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato` o `cliente.citta`. Il filtro diventa `{"stato": valore}`: uguaglianza.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire il blocco, anche se l'ingresso «lo avvia». Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |
| **Filtro (JSON, vuoto = tutti i documenti)** (`filter`) | JSON | vuoto | Il filtro, quando l'ingresso **filtro** non ha un valore. Vuoto: tutti i documenti. Si può scrivere anche come nella shell di MongoDB (vedi sotto). |
| **Documenti** (`many`) | Il primo che corrisponde (…One), Tutti quelli che corrispondono (…Many) | Il primo che corrisponde | Se il blocco agisce sul primo documento che corrisponde o su tutti. |
| **Tutti i documenti (anche con il filtro vuoto)** (`all`) | sì / no | no | Il permesso di cancellare con il filtro vuoto: senza, un filtro vuoto è un errore. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiama `deleteOne` (o `deleteMany`, con **Documenti** «Tutti quelli che corrispondono») con il filtro.

### Il filtro

- Il filtro è un oggetto JSON nel formato di MongoDB: `{"stato": "nuovo", "eta": {"$gt": 30}}`. Vedi la pagina [Blocchi MongoDB](logicstudio-mongodb) per i valori (ObjectId, date) e per la scrittura «da shell».
- L'ingresso **filtro** (se ha un valore non vuoto) vince sul **Filtro** delle impostazioni. Può essere un oggetto o un testo che contiene il JSON.
- Ogni **ingresso aggiunto** con un valore diventa `campo = valore` e si somma al filtro (se il campo c'è già, vale l'ingresso aggiunto). Un ingresso aggiunto che non ha ancora ricevuto un valore non conta. Un valore `null` cerca i documenti dove il campo è `null` o manca.
- Un ingresso aggiunto chiamato `_id` con un testo di 24 cifre esadecimali trova sia l'**ObjectId** sia il testo uguale.
- Un testo resta un testo; un oggetto è letto come Extended JSON: `{"$oid": "…"}` è un ObjectId, `{"$date": "…"}` una data.
- Il nome di un ingresso aggiunto non può cominciare con `$` né superare 200 caratteri.

### La protezione del filtro vuoto

Se il filtro (compresi gli ingressi aggiunti) è vuoto, il blocco **non fa niente** e dà l'errore «Filtro vuoto: eliminerebbe tutti i documenti…», a meno che **Tutti i documenti** sia spuntato. Così un campo di testo scollegato o un filtro scritto male non svuotano la raccolta. Con **Tutti i documenti** e **Documenti** «Tutti quelli che corrispondono» e un filtro vuoto si cancellano **tutti** i documenti della raccolta (la raccolta resta); con «Il primo che corrisponde», uno solo.

Anche un filtro che non è vuoto ma troppo largo cancella quello che trova: prova prima con [MongoDB · Conta (countDocuments)](mongo.count) o [MongoDB · Trova (find)](mongo.find), e usa **Prova** su una raccolta di prova.

## Esempi

### 1. Eliminare un documento scelto

**Raccolta** `contatti`, **Documenti** «Il primo che corrisponde». Aggiungi un ingresso chiamato `_id`.

```
[Campo di testo: id] testo ──▶ _id [MongoDB · Elimina (deleteOne · deleteMany)] eliminati ──▶ valore [Valore]
[Pulsante: Elimina] premuto ─────────────▶ esegui
```

Un testo di 24 cifre esadecimali trova l'ObjectId con quell'`_id`. Se l'id non c'è, `eliminati` è 0, senza errore.

### 2. Pulire i documenti vecchi

**Raccolta** `log`, **Filtro** `{"creato": {"$lt": {"$date": "2026-01-01T00:00:00Z"}}}`, **Documenti** «Tutti quelli che corrispondono».

```
[Intervallo (setInterval): 86400 s] impulso ──▶ esegui [MongoDB · Elimina (deleteOne · deleteMany)] eliminati ──▶ valore [Print (console.log)]
```

Una volta al giorno il programma elimina i documenti più vecchi del 2026. Con un filtro non vuoto non serve **Tutti i documenti**.

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
| Filtro vuoto: eliminerebbe tutti i documenti. Scrivi un filtro, oppure spunta «Tutti i documenti» se è proprio quello che vuoi | Il filtro è vuoto e **Tutti i documenti** non è spuntato. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Conta (countDocuments)](mongo.count), per controllare quanti ne troverebbe
- [MongoDB · Trova (find)](mongo.find), per vedere cosa elimina
- [MongoDB · Aggiorna (updateOne · updateMany)](mongo.update)
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
