# Elasticsearch · Leggi documento (get)

`es.get` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Legge il **documento** con un id da un indice. Se il documento non c'è non è un errore: **trovato** è `false` e **documento** è `null`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la lettura. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **id** (`id`) | testo | L'id del documento da leggere. Un numero va bene. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **documento** (`document`) | oggetto | Il documento (il suo `_source`, cioè i campi che hai scritto), o `null` se non c'è. L'id non è dentro il documento. |
| **trovato** (`found`) | sì/no | `true` se il documento c'è. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante, indice non valido, id mancante, indice che non c'è… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice da leggere, quando l'ingresso **indice** non ha un valore. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede `GET /indice/_doc/id` e manda **documento**, poi **trovato**. Un id che non esiste (404 con `found: false`) dà `null` e `false`. Un indice che non esiste è invece un errore del cluster («no such index»).

## Esempi

### 1. Mostrare un documento

```
[Campo di testo: id] testo ──▶ id [Elasticsearch · Leggi documento (get)] documento ──▶ oggetto [Get proprietà (obj.campo): messaggio] valore ──▶ valore [Valore]
[Pulsante: Leggi] premuto ──▶ esegui
```

### 2. Avvisare se non c'è

```
[Elasticsearch · Leggi documento (get)] trovato ──▶ a [Confronto (== ≠ < >): a = b] se falso ──▶ invia [Notify: "Documento non trovato"]
                                        [Costante · Variabile: true] valore ──▶ b
```

Con **trovato** `false` il confronto con `true` dà falso e [Notify](lilos.notify) avvisa.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice, né nell'ingresso né nelle impostazioni. |
| Nome dell'indice non valido: … | L'indice ha maiuscole, simboli o spazi vietati, o comincia con `-`, `_`, `+` (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Manca l'id del documento | L'id è vuoto. |
| Id del documento troppo lungo (al massimo 512 byte) | L'id supera 512 byte. |
| Elasticsearch ha risposto 404 (non trovato): … | L'indice non esiste. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Indicizza (index)](es.index), [Elasticsearch · Cerca (_search)](es.search), [Elasticsearch · Aggiorna (update)](es.update)
- [Get proprietà (obj.campo)](core.get), per leggere un campo del documento
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
