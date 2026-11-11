# Elasticsearch · Elimina documento (delete)

`es.delete` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Cancella il documento con un **id** da un indice. Se il documento non c'è non è un errore: **trovato** è `false`. **Cancella davvero**: provalo prima con **Prova** su un indice di prova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la cancellazione. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **id** (`id`) | testo | L'id del documento da cancellare. Un numero va bene. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **trovato** (`found`) | sì/no | `true` se il documento c'era ed è stato cancellato, `false` se non c'era. |
| **esito** (`result`) | testo | Nascosta. `deleted` oppure `not_found`. |
| **Exception** (`error`) | oggetto | Quando la cancellazione non riesce: connessione mancante, indice o id non validi, indice che non c'è… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice del documento, quando l'ingresso **indice** non ha un valore. |
| **Visibile alle ricerche** (`refresh`) | Tra poco (al prossimo refresh), Aspetta che sia visibile (wait_for), Subito (refresh: costoso) | Tra poco | Quando la cancellazione si vede nelle ricerche. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda `DELETE /indice/_doc/id` e manda **trovato**, poi **esito**. Cancella un documento solo: per molti documenti usa [Elasticsearch · Elimina per query (_delete_by_query)](es.deleteByQuery).

## Esempi

### 1. Cancellare un documento dal pulsante

```
[Campo di testo: id] testo ──▶ id [Elasticsearch · Elimina documento (delete)] trovato ──▶ a [Confronto (== ≠ < >): a = b] se falso ──▶ invia [Notify: "Non c'era"]
[Pulsante: Elimina] premuto ──▶ esegui                                      [Costante · Variabile: true] valore ──▶ b
```

### 2. Cancellare l'id letto da un elenco

```
[Elasticsearch · Cerca (_search)] documenti ──▶ oggetto [Get proprietà (obj.campo): 0._id] valore ──▶ id [Elasticsearch · Elimina documento (delete)]
[Intervallo (setInterval): 3600 s] impulso ──▶ esegui [Elasticsearch · Cerca (_search)]
```

Ogni ora la ricerca trova i documenti di una coda; [Get proprietà (obj.campo)](core.get) prende l'`_id` del primo e il blocco lo cancella. Il documento è identificato dal suo `_id`, che ogni risultato di [Elasticsearch · Cerca (_search)](es.search) porta con sé. Collegare anche **esegui** al blocco di cancellazione (con un breve [Ritardo (setTimeout)](core.delay)) fa partire la cancellazione dopo che l'id è arrivato.

## Errori

| Messaggio | Quando |
|---|---|
| Id del documento non valido: «..» | L'id è `.` o `..`, che nell'indirizzo indicherebbero l'indice intero. |
| Manca l'indice | Nessun indice. |
| Nome dell'indice non valido: … | L'indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Manca l'id del documento | L'id è vuoto. |
| Id del documento troppo lungo (al massimo 512 byte) | L'id supera 512 byte. |
| Elasticsearch ha risposto 404 (non trovato): … | L'indice non esiste. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Elimina per query (_delete_by_query)](es.deleteByQuery), [Elasticsearch · Indicizza (index)](es.index), [Elasticsearch · Leggi documento (get)](es.get)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
