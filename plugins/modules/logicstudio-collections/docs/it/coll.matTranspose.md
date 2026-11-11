# Transpose

`coll.matTranspose` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Scambia righe e colonne: la prima riga diventa la prima colonna, la seconda riga la seconda colonna, e così via.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice da trasporre. Non viene cambiata. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La trasposta: se la matrice ha R righe e C colonne, questa ha C righe e R colonne. |
| **Exception** (`error`) | oggetto | Quando il valore non è una matrice valida. |

## Come funziona

A ogni matrice che arriva il blocco manda la trasposta: la cella in riga *i* e colonna *j* finisce in riga *j* e colonna *i*.

- Le celle possono contenere qualsiasi valore: non servono numeri.
- Trasporre due volte ridà la matrice di partenza.
- Una matrice di una riga diventa una matrice di una colonna: `[[1, 2, 3]]` → `[[1], [2], [3]]`.
- La matrice deve essere valida (righe tutte della stessa lunghezza): vedi [Shape](coll.matSize).

## Esempi

### 1. Una matrice 2 × 3

```
[Costante · Variabile (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Transpose] matrice ──▶ valore [Print (console.log)]
```

Scrive `[[1,4],[2,5],[3,6]]` (3 × 2).

### 2. Da colonne di dati a righe

Se hai tre liste della stessa lunghezza, per esempio ore, temperature e umidità, mettile in una matrice (una lista per riga) con [Lista [ ]](core.list) e trasponi: ottieni una riga per ogni misura, `[ora, temperatura, umidità]`.

```
[Lista [ ]] lista ──▶ matrice [Transpose] matrice ──▶ valore [Print (console.log)]
```

Con `[[8,12,16],[18.5,23,21.5],[60,52,55]]` scrive `[[8,18.5,60],[12,23,52],[16,21.5,55]]`.

### 3. Un vettore colonna

`[[1, 2, 3]]` diventa `[[1], [2], [3]]`, che si può moltiplicare con [A × B](coll.matMultiply) a destra di una matrice di 3 colonne.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore non è una lista, è vuoto, o un suo elemento non è una lista. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |

## Vedi anche

- [A × B](coll.matMultiply), [Colonna m[][c]](coll.matCol), [Shape](coll.matSize)
- [Come funziona un blocco](ide/blocks)
