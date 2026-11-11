# Elasticsearch · Aggiorna (update)

`es.update` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Cambia **alcuni campi** del documento con un id (un *documento parziale*): gli altri campi restano come sono. Con «Crealo se non c'è» il documento viene aggiunto quando manca (*upsert*).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'aggiornamento. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **campi da cambiare** (`document`) | oggetto | I campi da cambiare, come oggetto (o testo JSON): `{ "stato": "chiuso" }`. Non avvia il blocco. |
| **id** (`id`) | testo | L'id del documento. Un numero va bene. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **esito** (`result`) | testo | `updated` (cambiato), `noop` (era già così, niente da cambiare) oppure `created` (nuovo, con upsert). |
| **id** (`id`) | testo | Nascosta. L'id del documento. |
| **Exception** (`error`) | oggetto | Quando l'aggiornamento non riesce: connessione mancante, documento che non c'è (senza upsert), campi mancanti… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice del documento, quando l'ingresso **indice** non ha un valore. |
| **Crealo se non c'è (upsert)** (`upsert`) | sì / no | no | Se è spuntato e il documento non c'è, viene creato con i campi dati. Se no, è un errore. |
| **Visibile alle ricerche** (`refresh`) | Tra poco (al prossimo refresh), Aspetta che sia visibile (wait_for), Subito (refresh: costoso) | Tra poco | Quando il cambiamento si vede nelle ricerche. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda `POST /indice/_update/id` con il documento parziale (e `doc_as_upsert` se serve). I campi dati sono **uniti** a quelli del documento: gli oggetti dentro si uniscono, le liste e i valori semplici si sostituiscono. Se tra il momento in cui il cluster legge e scrive il documento è cambiato, il cluster riprova fino a 3 volte.

## Esempi

### 1. Chiudere un ordine

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Aggiorna (update)] esito ──▶ valore [Notify: "Ordine aggiornato"]
[Oggetto { }] oggetto ──▶ campi da cambiare
[Campo di testo: id ordine] testo ──▶ id
[Pulsante: Chiudi] premuto ──▶ esegui
```

[Oggetto { }](core.compose) prepara `{ "stato": "chiuso" }`; gli altri campi dell'ordine non cambiano.

### 2. Un contatore con upsert

**Crealo se non c'è** spuntato. Ogni volta che arriva un evento, il blocco scrive `{ "ultimo_evento": "2026-11-11T10:00:00Z" }` nel documento `sensore-1`: se non c'era lo crea, se c'era cambia solo quel campo.

```
[Now (data e ora)] ISO ──▶ valore [Oggetto { }: ultimo_evento] oggetto ──▶ campi da cambiare [Elasticsearch · Aggiorna (update)]
```

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice. |
| Nome dell'indice non valido: … | L'indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Manca l'id del documento | L'id è vuoto. |
| Id del documento troppo lungo (al massimo 512 byte) | L'id supera 512 byte. |
| Manca il documento (i campi da cambiare) | I campi da cambiare sono vuoti. |
| Documento non valido: serve un oggetto JSON | È un testo che non è JSON. |
| Documento non valido: serve un oggetto JSON { … } | È una lista, un numero o altro. |
| Elasticsearch ha risposto 404 (non trovato): document_missing_exception: … | Il documento non c'è e l'upsert non è spuntato. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Indicizza (index)](es.index), [Elasticsearch · Leggi documento (get)](es.get), [Elasticsearch · Elimina documento (delete)](es.delete)
- [Oggetto { }](core.compose), [Now (data e ora)](core.now)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
