# Imposta cella

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
| **Eccezione** (`error`) | oggetto | Matrice non valida, riga o colonna non intere o fuori dalla matrice. |

## Come funziona

Il blocco aspetta di avere tutti e quattro gli ingressi; poi, a ogni valore nuovo, manda la matrice con la cella cambiata.

- Righe e colonne si contano da 0; i negativi contano dalla fine (come in [Leggi cella](coll.matGet)).
- Si può cambiare solo una cella che c'è: la matrice non si allarga. Fuori esce «Indice fuori dalla lista».
- Il valore può essere qualsiasi cosa, anche un testo o `null`. Una matrice con celle non numeriche non va però bene per i calcoli (Somma matrici, Moltiplica matrici, Scala, Determinante).
- La matrice in ingresso resta com'era: se va anche ad altri blocchi, loro vedono la vecchia. Per tenere la matrice cambiata, rimandala in una [Memoria](core.store).

## Esempi

### 1. Una cella

```
[Valore (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Imposta cella] matrice ──▶ valore [Scrivi in console]
[Valore: 0]                        valore ──▶ riga
[Valore: 0]                        valore ──▶ colonna
[Valore: 9]                        valore ──▶ valore
```

Scrive `[[9,2,3],[4,5,6]]`.

### 2. L'ultima cella

Sulla stessa matrice, riga `-1`, colonna `-1` e valore `"x"` danno `[[1,2,3],[4,5,"x"]]`. Riga `5` dà «Indice fuori dalla lista».

### 3. Una griglia di gioco

```
[Memoria (Invia quando cambia)] valore ──▶ matrice [Imposta cella] matrice ──▶ imposta [Memoria]
                                                                    matrice ──▶ righe [Tabella]
[Campo numerico: riga]    valore ──▶ riga
[Campo numerico: colonna] valore ──▶ colonna
[Valore (testo): X]       valore ──▶ valore
```

Dai all'ingresso **imposta** della Memoria la matrice di partenza (per esempio fatta con [Crea matrice](coll.matNew) 3 × 3 di `"-"`) e togli «lo avvia» da **matrice**. A ogni coppia riga e colonna la X va nella cella. La [Tabella](ui.table) mostra una riga per ogni riga della griglia, scritta come lista (per esempio `["X","-","-"]`): la Tabella divide in colonne solo le righe fatte di oggetti.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| Indice: serve un numero intero | Riga o colonna hanno la virgola o non sono numeri. |
| Indice fuori dalla lista | Riga o colonna fuori dalla matrice. |

## Vedi anche

- [Leggi cella](coll.matGet), [Crea matrice](coll.matNew)
- [Imposta elemento](coll.set) per una lista
- [Come funziona un blocco](ide/blocks)
