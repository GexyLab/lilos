# Elasticsearch · Conta (_count)

`es.count` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Conta quanti documenti trova una **query** in uno o più indici, senza leggerli. Ogni ingresso aggiunto è un `match` *campo = valore*, in AND con la query. Senza query conta tutti i documenti.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire il conteggio. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **query** (`query`) | qualsiasi | Nascosta. La query come oggetto (o testo JSON). Se ha un valore non vuoto, prende il posto della **Query** delle impostazioni. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **quanti** (`count`) | numero | Quanti documenti corrispondono. |
| **Exception** (`error`) | oggetto | Quando il conteggio non riesce: connessione mancante, indice non valido, query sbagliata… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice (o più indici separati da virgole, fino a 64), quando l'ingresso **indice** non ha un valore. |
| **Query (JSON; vuota: tutti)** (`query`) | testo JSON su più righe | vuoto | Quali documenti contare, in Query DSL. Vuota: tutti i documenti. Se ha le chiavi di un corpo (`{ "query": … }`), conta la sua `query`. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo**: si chiama **campo 1**, **campo 2**… e va **rinominato** con il nome del campo del documento, per esempio `stato`. Un valore diventa `{ "match": { "campo": valore } }`, una lista diventa `{ "terms": … }`; sono in AND con la query. Un ingresso senza valore (vuoto o `null`) non conta.

Gli ingressi aggiunti **tengono solo il loro valore**: il conteggio parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda `POST /indice/_count` con la query e manda **quanti**. Il numero è esatto (non ha il limite dei 10000 del totale di una ricerca).

## Esempi

### 1. Quanti documenti ci sono

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Conta (_count)] quanti ──▶ valore [Valore: documenti]
[Intervallo (setInterval): 60 s] impulso ──▶ esegui
```

Impostazioni: **Indice** `eventi`. Ogni minuto il [Valore](ui.value) mostra quanti eventi ci sono.

### 2. Quanti documenti di un certo tipo

Un ingresso aggiunto, rinominato `livello`.

```
[Selezione: livello] valore ──▶ livello [Elasticsearch · Conta (_count)] quanti ──▶ valore [Valore]
[Pulsante: Conta] premuto ──▶ esegui
```

Scegliendo `errore`, conta i documenti con `livello` `errore`.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice. |
| Troppi indici (al massimo 64) | Più di 64 indici nell'elenco. |
| Nome dell'indice non valido: … | Un indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Query non valido: serve un oggetto JSON | La query è un testo che non è JSON. |
| Query non valido: serve un oggetto JSON { … } | La query è una lista, un numero o altro. |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | L'indice non esiste. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | La query non va bene per il cluster. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Cerca (_search)](es.search), [Elasticsearch · Elimina per query (_delete_by_query)](es.deleteByQuery), [Elasticsearch · Indici (_cat/indices)](es.indices)
- [Intervallo (setInterval)](core.every)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
