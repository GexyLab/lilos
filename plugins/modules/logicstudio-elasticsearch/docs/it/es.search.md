# Elasticsearch · Cerca (_search)

`es.search` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Cerca i documenti di uno o più indici con una **query** (Query DSL, in JSON) e manda i documenti trovati, il totale e le eventuali aggregazioni. Ogni ingresso aggiunto è un `match` *campo = valore*, messo in AND con la query.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la ricerca. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **query** (`query`) | qualsiasi | Nascosta. La query come oggetto (o testo JSON). Se ha un valore non vuoto, prende il posto della **Query** delle impostazioni. Non avvia il blocco. |
| **quanti** (`size`) | numero | Nascosta. Quanti documenti al massimo. Prende il posto di **Quanti (size)**. Non avvia il blocco. |
| **da** (`from`) | numero | Nascosta. Da quale documento partire (per le pagine). Prende il posto di **Da (from)**. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **documenti** (`hits`) | lista | I documenti trovati: ognuno è un oggetto con i campi del documento e in più `_id`, l'id. |
| **totale** (`total`) | numero | Quanti documenti ha trovato la ricerca in tutto (non solo quelli usciti). Elasticsearch conta con esattezza fino a 10000: oltre, il numero può essere approssimato, a meno che nel corpo della ricerca non ci sia `"track_total_hits": true`. |
| **aggregazioni** (`aggregations`) | oggetto | Nascosta. Il risultato delle aggregazioni (`aggs`) della ricerca, o `null`. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se hai chiesto più documenti di quelli che il modulo permette (10000 di serie). |
| **Exception** (`error`) | oggetto | Quando la ricerca non riesce: connessione mancante, indice non valido, query sbagliata, risultato troppo grande… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice (o più indici separati da virgole, `a, b`) da cercare, quando l'ingresso **indice** non ha un valore. |
| **Query (JSON)** (`query`) | testo JSON su più righe | `{ "match_all": {} }` | La query. Vuota o `match_all`: tutti i documenti. Può essere la sola query (`{ "match": { "titolo": "caffè" } }`) o un **corpo intero** (`{ "query": …, "aggs": … }`, vedi sotto). |
| **Quanti (size)** (`size`) | da 0 a 1000000 | 10 | Quanti documenti al massimo. Non può superare il limite del modulo (10000 di serie). |
| **Da (from)** (`from`) | da 0 a 1000000 | 0 | Da quale documento partire. |
| **Ordine (per esempio data:desc, nome)** (`sort`) | testo | vuoto | L'ordine dei documenti: campi separati da virgole, ognuno con `:asc` o `:desc` (di serie `asc`), per esempio `data:desc, nome`. Oppure JSON (una lista o un oggetto di Elasticsearch). |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo** della ricerca: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `citta`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la ricerca. La ricerca parte solo con **esegui**. Un ingresso senza valore (vuoto o `null`) non conta. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda la ricerca al cluster (`POST /indice/_search`) e manda **documenti**, **totale**, **aggregazioni** e **troncato**.

### La query e il corpo

- Se la **query** è solo una query (`{ "term": … }`), la ricerca la usa così. Se ha chiavi di un corpo di ricerca (`query`, `aggs`, `aggregations`, `_source`, `sort`, `size`, `from`, `highlight`, `track_total_hits`, `search_after`, `knn`…), è un **corpo intero** e viene mandato com'è, con le impostazioni **Quanti**, **Da** e **Ordine** che passano sopra.
- Un testo JSON viene letto; un testo che non è JSON dà errore.
- Per avere solo le aggregazioni, metti **Quanti** a 0.

### Gli ingressi aggiunti

Ogni ingresso aggiunto con un valore diventa una condizione in AND con la query: un valore normale diventa `{ "match": { "campo": valore } }`; una **lista** diventa `{ "terms": { "campo": [ … ] } }` (uno qualsiasi dei valori). Un oggetto diventa testo JSON. Se la query prende tutti i documenti, restano solo queste condizioni.

### Quanti documenti

**Quanti** non può superare il limite del modulo (**Documenti di un risultato**, 10000 di serie): se chiedi di più, escono quelli permessi e **troncato** è `true`. Un risultato più grande della dimensione massima è un errore. Per leggere oltre i primi documenti usa **Da** con **Quanti**, ma Elasticsearch non permette di andare oltre 10000 in totale con `from + size`: per quello servono `search_after` o altre tecniche nel corpo.

### Più indici

Nell'**Indice** puoi scrivere più indici separati da virgole (`log-1, log-2`), fino a 64.

## Esempi

### 1. Cercare per parola e mostrare i risultati

Impostazioni: **Indice** `articoli`, **Query** `{ "match": { "titolo": "caffè" } }`, **Ordine** `data:desc`, **Quanti** 20.

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Cerca (_search)] documenti ──▶ righe [Tabella]
[Pulsante: Cerca] premuto ──▶ esegui                                                  totale ──▶ valore [Valore: trovati]
```

### 2. Un filtro con due campi

Due ingressi aggiunti, rinominati `citta` e `stato`. **Query** `{ "match_all": {} }`.

```
[Selezione: città] valore ──▶ citta [Elasticsearch · Cerca (_search)] documenti ──▶ righe [Tabella]
[Selezione: stato] valore ──▶ stato
[Pulsante: Filtra] premuto ──▶ esegui
```

Se scegli `Roma` e `attivo`, la ricerca è `bool.must = [ match citta=Roma, match stato=attivo ]`. Un campo lasciato vuoto non filtra.

### 3. Contare per gruppo con le aggregazioni

**Query**:

```
{ "size": 0, "aggs": { "per_citta": { "terms": { "field": "citta.keyword" } } } }
```

```
[Pulsante: Conta] premuto ──▶ esegui [Elasticsearch · Cerca (_search)] aggregazioni ──▶ oggetto [Get proprietà (obj.campo): per_citta.buckets] valore ──▶ righe [Tabella]
```

Le chiavi `size` e `aggs` fanno riconoscere un corpo intero; il numero di documenti lo decide `size: 0`. Le aggregazioni sono l'uscita nascosta **aggregazioni**.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice. |
| Troppi indici (al massimo 64) | Più di 64 indici nell'elenco. |
| Nome dell'indice non valido: … | Un indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Query non valido: serve un oggetto JSON | La query è un testo che non è JSON. |
| Query non valido: serve un oggetto JSON { … } | La query è una lista, un numero o altro. |
| Quanti (size) non valido: … (un intero da 0 a 1000000) | **Quanti** non è un intero in quell'intervallo. |
| Da (from) non valido: … (un intero da 0 a 1000000) | **Da** non è un intero in quell'intervallo. |
| Ordine non valido: JSON sbagliato | L'ordine comincia con `[` o `{` ma non è JSON. |
| Ordine non valido: … (asc o desc) | Un elemento dell'ordine ha un verso diverso da `asc` o `desc`. |
| Elasticsearch ha risposto 400 (richiesta non valida): search_phase_execution_exception: … | La query non va bene per il cluster (campo di tipo sbagliato, sintassi…). |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | L'indice non esiste. |

Gli errori comuni (connessione, rete, quote, risultato troppo grande) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Connessione (connect)](es.connect), [Elasticsearch · Conta (_count)](es.count), [Elasticsearch · Leggi documento (get)](es.get), [Elasticsearch · Elimina per query (_delete_by_query)](es.deleteByQuery)
- [Get proprietà (obj.campo)](core.get), per leggere un campo di un risultato
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
