# MongoDB · Conta (countDocuments)

`mongo.count` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Conta quanti documenti corrispondono al **filtro**, senza leggerli. Ogni ingresso aggiunto è un campo del filtro.

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
| **quanti** (`count`) | numero | Quanti documenti corrispondono al filtro. Con il filtro vuoto, tutti quelli della raccolta. |
| **Exception** (`error`) | oggetto | Quando il conteggio non riesce: connessione mancante o chiusa, filtro non valido, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo del filtro**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato` o `cliente.citta`. Il filtro diventa `{"stato": valore}`: uguaglianza.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire il blocco, anche se l'ingresso «lo avvia». Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (collection)** (`collection`) | testo | vuoto | Il nome della raccolta, quando l'ingresso **raccolta** non ha un valore. Al massimo 200 caratteri, senza `$` né caratteri nulli. |
| **Filtro (JSON, vuoto = tutti i documenti)** (`filter`) | JSON | vuoto | Il filtro, quando l'ingresso **filtro** non ha un valore. Vuoto: tutti i documenti. Si può scrivere anche come nella shell di MongoDB (vedi sotto). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiama `countDocuments(filtro)` con il tempo massimo di un'operazione anche sul server.

### Il filtro

- Il filtro è un oggetto JSON nel formato di MongoDB: `{"stato": "nuovo", "eta": {"$gt": 30}}`. Vedi la pagina [Blocchi MongoDB](logicstudio-mongodb) per i valori (ObjectId, date) e per la scrittura «da shell».
- L'ingresso **filtro** (se ha un valore non vuoto) vince sul **Filtro** delle impostazioni. Può essere un oggetto o un testo che contiene il JSON.
- Ogni **ingresso aggiunto** con un valore diventa `campo = valore` e si somma al filtro (se il campo c'è già, vale l'ingresso aggiunto). Un ingresso aggiunto che non ha ancora ricevuto un valore non conta. Un valore `null` cerca i documenti dove il campo è `null` o manca.
- Un ingresso aggiunto chiamato `_id` con un testo di 24 cifre esadecimali trova sia l'**ObjectId** sia il testo uguale.
- Un testo resta un testo; un oggetto è letto come Extended JSON: `{"$oid": "…"}` è un ObjectId, `{"$date": "…"}` una data.
- Il nome di un ingresso aggiunto non può cominciare con `$` né superare 200 caratteri.

Il numero non ha il limite dei documenti massimi di un risultato: è un numero solo, e può essere più grande di 10000. Su una raccolta molto grande con un filtro che non usa un indice il conteggio può essere lento e fermarsi per il tempo massimo.

## Esempi

### 1. Quanti ordini nuovi

**Raccolta** `ordini`. Aggiungi un ingresso chiamato `stato`, collegato a una [Costante · Variabile](core.value) con il testo `nuovo`.

```
[Intervallo (setInterval): 30 s] impulso ──▶ esegui [MongoDB · Conta (countDocuments)] quanti ──▶ valore [Valore: ordini nuovi]
[Costante · Variabile: "nuovo"] valore ──▶ stato
```

Ogni 30 secondi il [Valore](ui.value) mostra quanti ordini hanno `stato` uguale a `nuovo`.

### 2. Avvisare se ce ne sono troppi

```
[MongoDB · Conta (countDocuments): code] quanti ──▶ a [Confronto (== ≠ < >): a > b] se vero ──▶ invia [Notify: "Troppi lavori in coda"]
[Costante · Variabile: 100] valore ──▶ b
```

[Confronto (== ≠ < >)](core.compare) con `a > b` e 100 manda una [Notify](lilos.notify) quando la coda supera 100 documenti.

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
| MongoDB non ha risposto in 30 s | Il conteggio ha superato il tempo massimo di un'operazione. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Trova (find)](mongo.find), per leggere i documenti
- [MongoDB · Aggrega (aggregate)](mongo.aggregate), per contare per gruppi
- [Confronto (== ≠ < >)](core.compare), per reagire al numero
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
