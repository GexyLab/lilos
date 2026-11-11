# Elasticsearch · Elimina per query (_delete_by_query)

`es.deleteByQuery` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Cancella **tutti i documenti** che una query trova in un indice. Una query vuota, o che prende tutti i documenti (come `match_all`), è **rifiutata**, a meno che la casella «Tutti i documenti» sia spuntata. Ogni ingresso aggiunto è un `match` *campo = valore*, in AND con la query. **Cancella davvero**: provalo prima con **Prova** e conta prima con [Elasticsearch · Conta (_count)](es.count).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la cancellazione. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **query** (`query`) | qualsiasi | Nascosta. La query come oggetto (o testo JSON). Se ha un valore non vuoto, prende il posto della **Query** delle impostazioni. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **cancellati** (`deleted`) | numero | Quanti documenti sono stati cancellati. |
| **Exception** (`error`) | oggetto | Quando la cancellazione non riesce: connessione mancante, query che prende tutto, query sbagliata… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice (uno solo) dove cancellare, quando l'ingresso **indice** non ha un valore. |
| **Query (JSON)** (`query`) | testo JSON su più righe | vuoto | Quali documenti cancellare, in Query DSL: `{ "range": { "data": { "lt": "2026-01-01" } } }`. Se ha le chiavi di un corpo (`{ "query": … }`), conta la sua `query`. |
| **Tutti i documenti (anche senza query)** (`all`) | sì / no | no | Senza questa casella, una query che prende tutto è un errore. Spuntata, si cancellano **tutti** i documenti dell'indice. |
| **Visibile subito (refresh)** (`refresh`) | sì / no | no | Se è spuntata, dopo la cancellazione l'indice viene rinfrescato e la cancellazione si vede subito nelle ricerche. Costa al cluster. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato`. Un valore diventa `{ "match": { "campo": valore } }`, una lista diventa `{ "terms": … }`; sono in AND con la query. Un ingresso senza valore non conta.

Gli ingressi aggiunti **tengono solo il loro valore**: la cancellazione parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**:

1. Il blocco costruisce la query (la **Query** con gli ingressi aggiunti in AND).
2. Se la query prende tutti i documenti (nessuna query, `{}`, `match_all`, o un `bool` che non filtra niente) e **Tutti i documenti** non è spuntata, si ferma con un errore.
3. Altrimenti manda `POST /indice/_delete_by_query` (con `conflicts=proceed`: i documenti cambiati nel frattempo si saltano) e manda **cancellati**.

Con gli ingressi aggiunti pieni, la query non prende più tutto: per esempio con `stato = vecchio` cancella solo i documenti con quello stato.

## Esempi

### 1. Togliere i registri vecchi, ogni notte

Impostazioni: **Indice** `registri`, **Query** `{ "range": { "quando": { "lt": "now-30d" } } }`.

```
[Intervallo (setInterval): 86400 s] impulso ──▶ esegui [Elasticsearch · Elimina per query (_delete_by_query)] cancellati ──▶ valore [Print (console.log)]
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione
```

### 2. Cancellare per stato

Un ingresso aggiunto, rinominato `stato`. **Query** vuota.

```
[Selezione: stato] valore ──▶ stato [Elasticsearch · Elimina per query (_delete_by_query)] cancellati ──▶ valore [Valore: cancellati]
[Pulsante: Elimina] premuto ──▶ esegui
```

Se la selezione è vuota, nessuna condizione e la query prende tutto: la cancellazione viene **rifiutata**, e niente va perso.

## Errori

| Messaggio | Quando |
|---|---|
| La query prende tutti i documenti dell'indice: per cancellarli davvero tutti spunta «Tutti i documenti» | La query è vuota o prende tutto e la casella non è spuntata. |
| Manca l'indice | Nessun indice. |
| Nome dell'indice non valido: … | L'indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). Qui l'indice è uno solo (niente virgole). |
| Query non valido: serve un oggetto JSON | La query è un testo che non è JSON. |
| Query non valido: serve un oggetto JSON { … } | La query è una lista, un numero o altro. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | La query non va bene per il cluster. |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | L'indice non esiste. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Conta (_count)](es.count), [Elasticsearch · Cerca (_search)](es.search), [Elasticsearch · Elimina documento (delete)](es.delete)
- [Intervallo (setInterval)](core.every)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
