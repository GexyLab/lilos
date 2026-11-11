# Scrivi m[r][c]

`coll.matSet` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Cambia il valore di una cella e manda la matrice nuova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice di partenza. Non viene cambiata: il blocco ne fa una copia. |
| **riga** (`row`) | numero | La riga: 0 è la prima, -1 l'ultima. |
| **colonna** (`col`) | numero | La colonna: 0 è la prima, -1 l'ultima. |
| **valore** (`value`) | qualsiasi | Il valore da mettere nella cella. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | Una copia della matrice con la cella cambiata. Ha le stesse dimensioni. |
| **Exception** (`error`) | oggetto | Matrice non valida, riga o colonna non intere o fuori dalla matrice. |

## Come funziona

Il blocco aspetta di avere tutti e quattro gli ingressi; poi, a ogni valore nuovo, manda la matrice con la cella cambiata.

- Righe e colonne si contano da 0; i negativi contano dalla fine (come in [Leggi m[r][c]](coll.matGet)).
- Si può cambiare solo una cella che c'è: la matrice non si allarga. Fuori esce «Indice fuori dalla lista».
- Il valore può essere qualsiasi cosa, anche un testo o `null`. Una matrice con celle non numeriche non va però bene per i calcoli (A + B, A × B, Scala (k·A), Det).
- La matrice in ingresso resta com'era: se va anche ad altri blocchi, loro vedono la vecchia. Per tenere la matrice cambiata, rimandala in un blocco [Memoria (set · get)](core.store).

## Esempi

### 1. Una cella

```
[Costante · Variabile (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Scrivi m[r][c]] matrice ──▶ valore [Print (console.log)]
[Costante · Variabile: 0]                        valore ──▶ riga
[Costante · Variabile: 0]                        valore ──▶ colonna
[Costante · Variabile: 9]                        valore ──▶ valore
```

Scrive `[[9,2,3],[4,5,6]]`.

### 2. L'ultima cella

Sulla stessa matrice, riga `-1`, colonna `-1` e valore `"x"` danno `[[1,2,3],[4,5,"x"]]`. Riga `5` dà «Indice fuori dalla lista».

### 3. Una griglia di gioco

```
[Memoria (set · get): Invia quando cambia] valore ──▶ matrice [Scrivi m[r][c]] matrice ──▶ imposta [Memoria (set · get)]
                                                                    matrice ──▶ righe [Tabella]
[Campo numerico: riga]    valore ──▶ riga
[Campo numerico: colonna] valore ──▶ colonna
[Costante · Variabile (testo): X]       valore ──▶ valore
```

Dai all'ingresso **imposta** del blocco Memoria (set · get) la matrice di partenza (per esempio fatta con [Nuova matrice (fill)](coll.matNew) 3 × 3 di `"-"`) e togli «lo avvia» da **matrice**. A ogni coppia riga e colonna la X va nella cella. La [Tabella](ui.table) mostra una riga per ogni riga della griglia, scritta come lista (per esempio `["X","-","-"]`): la Tabella divide in colonne solo le righe fatte di oggetti.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| Indice: serve un numero intero | Riga o colonna hanno la virgola o non sono numeri. |
| Indice fuori dalla lista | Riga o colonna fuori dalla matrice. |

## Vedi anche

- [Leggi m[r][c]](coll.matGet), [Nuova matrice (fill)](coll.matNew)
- [Scrivi lista[i]](coll.set) per una lista
- [Come funziona un blocco](ide/blocks)
