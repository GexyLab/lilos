# Elasticsearch · Indici (_cat/indices)

`es.indices` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Elenca gli **indici** del cluster, con quanti documenti hanno, il loro stato e la dimensione. Serve per riempire una selezione o per tenere d'occhio la crescita dei dati.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la richiesta. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **nomi** (`names`) | lista | I nomi degli indici, in ordine alfabetico, per esempio `["eventi", "utenti"]`. |
| **indici** (`indices`) | lista | Nascosta. Gli indici per esteso: una lista di oggetti `{ "index": "eventi", "health": "green", "status": "open", "docs": 1250, "bytes": 482113 }`. `docs` è il numero di documenti, `bytes` la dimensione su disco; `health` e `status` o `docs` possono essere `null` (per esempio per un indice chiuso). |
| **Exception** (`error`) | oggetto | Quando la richiesta non riesce: connessione mancante, permesso negato, quota finita… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

Questo blocco non ha impostazioni.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede `GET /_cat/indices` in JSON e manda **nomi**, poi **indici**. Escono al massimo tanti indici quanti sono le righe massime del modulo (10000 di serie). Gli indici di sistema (quelli che cominciano con un punto) ci sono, se il cluster li mostra a quell'utente.

## Esempi

### 1. Riempire una selezione

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Indici (_cat/indices)] nomi ──▶ opzioni [Selezione: indice]
[Intervallo (setInterval): 600 s] impulso ──▶ esegui
```

### 2. Una tabella di indici con la dimensione

```
[Pulsante: Aggiorna] premuto ──▶ esegui [Elasticsearch · Indici (_cat/indices)] indici ──▶ righe [Tabella]
```

La [Tabella](ui.table) mostra una riga per indice con `docs` e `bytes`.

## Errori

| Messaggio | Quando |
|---|---|
| Elasticsearch ha risposto 403 (permesso negato): … | L'utente non può leggere l'elenco degli indici. |
| Elasticsearch ha risposto 401 (utente, password o chiave API non validi): … | Le credenziali non sono più valide. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Conta (_count)](es.count), [Elasticsearch · Cerca (_search)](es.search), [Elasticsearch · Connessione (connect)](es.connect)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
