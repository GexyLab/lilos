# Slice

`coll.slice` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Prende un pezzo di una lista: gli elementi da una posizione a un'altra (quest'ultima esclusa).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da cui prendere il pezzo. Non viene cambiata. |
| **da** (`from`) | numero | La posizione del primo elemento da prendere. Facoltativo: se non arriva niente vale 0 (dall'inizio). |
| **a (escluso)** (`to`) | numero | La posizione **dopo** l'ultimo elemento da prendere. Facoltativo: se non arriva niente vale la lunghezza della lista (fino alla fine). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Il pezzo di lista: può essere vuoto. |
| **Exception** (`error`) | oggetto | Lista non valida, **da** o **a** non interi. |

## Come funziona

Basta la **lista** perché il blocco giri: **da** e **a (escluso)** sono facoltativi. Ogni valore nuovo su uno dei tre ingressi fa ripartire il blocco con gli ultimi valori.

Il pezzo contiene gli elementi con posizione da **da** fino a **a** − 1. Esempio con `[10, 20, 30, 40, 50]`:

| da | a (escluso) | risultato |
|---|---|---|
| — | — | `[10, 20, 30, 40, 50]` (tutta) |
| 1 | 3 | `[20, 30]` |
| 0 | 2 | `[10, 20]` (i primi due) |
| -2 | — | `[40, 50]` (gli ultimi due) |
| 1 | -1 | `[20, 30, 40]` (senza il primo e l'ultimo) |
| 3 | 1 | `[]` (da dopo a: niente) |
| 10 | — | `[]` (oltre la fine) |
| -100 | 100 | `[10, 20, 30, 40, 50]` |

A differenza di [Leggi lista[i]](coll.get), **qui una posizione fuori dalla lista non è un errore**: viene portata al limite più vicino (l'inizio o la fine). Un numero negativo conta dalla fine, come negli altri blocchi.

Come vengono letti **da** e **a**:

- devono essere interi: `1.5` dà «Da: serve un numero intero» (o «A: serve un numero intero»);
- `"2"` vale 2, `true` vale 1;
- `""` e `null` valgono **0**. Attenzione: `null` su **a (escluso)** dà quindi una porzione vuota, non «fino alla fine». Per «fino alla fine» non mandare niente su **a**.

## Esempi

### 1. I primi tre

```
[Costante · Variabile (JSON): ["a","b","c","d","e"]] valore ──▶ lista      [Slice] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 3]                            valore ──▶ a (escluso)
```

Scrive `["a","b","c"]` (**da** non arriva e vale 0).

> Il blocco gira già quando arriva la lista, prima del 3: la console scrive anche la lista intera. Togli «lo avvia» da **lista** per avere una riga sola.

### 2. Gli ultimi 10 valori

Dai all'ingresso **da** il valore iniziale `-10`:

```
[Accumula (push con limite): massimo 1000] lista ──▶ lista [Slice (da = -10)] risultato ──▶ dati [Linee]
```

Il grafico [Linee](charts.line) mostra sempre gli ultimi 10 valori raccolti; finché ne sono arrivati meno di 10, li mostra tutti.

### 3. Pagine di una tabella

Con 20 righe per pagina, la pagina *n* (da 0) va da `n × 20` a `n × 20 + 20`. Calcola i due numeri con [Moltiplicazione (×)](core.multiply) e [Somma (+)](core.add) e collegali a **da** e **a (escluso)**: oltre l'ultima pagina il risultato è `[]`, senza errori.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Da: serve un numero intero | **da** ha la virgola o non è un numero. |
| A: serve un numero intero | **a (escluso)** ha la virgola o non è un numero. |

## Vedi anche

- [Leggi lista[i]](coll.get), [Rimuovi (splice)](coll.removeAt), [Concat liste](coll.concat)
- [Come funziona un blocco](ide/blocks)
