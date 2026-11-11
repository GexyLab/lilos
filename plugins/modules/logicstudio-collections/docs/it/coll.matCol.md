# Leggi colonna

`coll.matCol` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Prende una colonna intera di una matrice, come lista: il valore di quella colonna in ogni riga.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice. |
| **colonna** (`col`) | numero | La colonna da prendere: 0 è la prima, -1 l'ultima. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **colonna** (`col`) | lista | I valori della colonna, dalla prima riga all'ultima: tanti quante sono le righe. |
| **Eccezione** (`error`) | oggetto | Matrice non valida, colonna non intera o fuori dalla matrice. |

## Come funziona

Il blocco aspetta di avere **matrice** e **colonna**; poi, a ogni valore nuovo, manda la colonna scelta.

- Le colonne si contano da 0; i negativi contano dalla fine (-1 è l'ultima).
- Fuori dalla matrice esce «Indice fuori dalla lista».
- La colonna deve essere un intero: `0.5` dà «Indice: serve un numero intero». `"1"` vale 1; `""` e `null` valgono 0.
- L'uscita è una lista normale: puoi usarla con tutti i blocchi delle liste.

## Esempi

### 1. La seconda colonna

```
[Valore (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Leggi colonna] colonna ──▶ valore [Scrivi in console]
[Valore: 1]                        valore ──▶ colonna
```

Scrive `[2,5]`. Con colonna `-1` scrive `[3,6]`; con colonna `3` esce «Indice fuori dalla lista».

### 2. La media di una colonna di misure

Una matrice in cui ogni riga è `[ora, temperatura, umidità]`:

```
[Valore (JSON): [[8,18.5,60],[12,23,52],[16,21.5,55]]] valore ──▶ matrice [Leggi colonna] colonna ──▶ lista [Somma · Minimo · Massimo · Media: media] risultato ──▶ valore [Valore mostrato]
[Valore: 1]                                            valore ──▶ colonna
```

Mostra la temperatura media: 21. Con colonna 2, l'umidità media: 55,666…

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| Indice: serve un numero intero | La colonna ha la virgola o non è un numero. |
| Indice fuori dalla lista | La colonna è fuori dalla matrice. |

## Vedi anche

- [Leggi riga](coll.matRow), [Leggi cella](coll.matGet), [Trasposta](coll.matTranspose)
- [Estrai campo](coll.pluck) con un numero come campo fa lo stesso su qualsiasi lista di liste
- [Come funziona un blocco](ide/blocks)
