# Moltiplica matrici

`coll.matMultiply` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Fa il prodotto righe per colonne di due matrici (il prodotto «matematico», non cella per cella).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | matrice | La matrice di sinistra. Solo numeri. |
| **b** | matrice | La matrice di destra: deve avere tante righe quante sono le colonne di **a**. Solo numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | matrice | Il prodotto: ha le righe di **a** e le colonne di **b**. |
| **Eccezione** (`error`) | oggetto | Matrice non valida, celle non numeriche, misure che non si possono moltiplicare, risultato troppo grande. |

## Come funziona

Il blocco aspetta di avere **a** e **b**; poi, a ogni valore nuovo su uno dei due, manda il prodotto.

**Come si calcola.** Se **a** è R × K e **b** è K × C, il risultato è R × C. La cella in riga *i* e colonna *j* è la somma dei prodotti della riga *i* di **a** per la colonna *j* di **b**: `a[i][0]×b[0][j] + a[i][1]×b[1][j] + …`.

- **L'ordine conta**: in generale **a × b** non è **b × a**, e le misure possono permettere uno solo dei due.
- Le colonne di **a** devono essere quante le righe di **b**, altrimenti esce per esempio «Prodotto impossibile: le colonne di A (3) devono essere quante le righe di B (2)».
- **Le celle devono essere numeri veri**: un testo come `"2"` dà «La matrice deve contenere solo numeri».
- Il risultato può avere al massimo 100000 celle (R × C), altrimenti «Matrice troppo grande (massimo 100000 celle)».
- Il risultato non viene arrotondato.
- Per moltiplicare cella per cella non c'è un blocco; per moltiplicare tutte le celle per un numero usa [Scala](coll.matScale).

## Esempi

### 1. 2 × 3 per 3 × 2

```
[Valore (JSON): [[1,2,3],[4,5,6]]]     valore ──▶ a  [Moltiplica matrici] risultato ──▶ valore [Scrivi in console]
[Valore (JSON): [[1,0],[0,1],[1,1]]]   valore ──▶ b
```

Scrive `[[4,5],[10,11]]`. Per esempio la prima cella è `1×1 + 2×0 + 3×1 = 4`.

### 2. Riga per colonna, colonna per riga

- **a** = `[[1,2]]` (1 × 2), **b** = `[[3],[4]]` (2 × 1): risultato `[[11]]` (1 × 1), cioè 1×3 + 2×4.
- Scambiandole, **a** = `[[3],[4]]`, **b** = `[[1,2]]`: risultato `[[3,6],[4,8]]` (2 × 2).

### 3. Misure sbagliate

**a** = `[[1,2,3],[4,5,6]]` per sé stessa dà «Prodotto impossibile: le colonne di A (3) devono essere quante le righe di B (2)». Con **b** collegata attraverso una [Trasposta](coll.matTranspose) il prodotto si può fare: `[[14,32],[32,77]]`.

### 4. Ruotare un punto

La matrice `[[0,-1],[1,0]]` ruota di 90° in senso antiorario: con **a** = `[[0,-1],[1,0]]` e **b** = `[[3],[1]]` (il punto x 3, y 1 come colonna) il risultato è `[[-1],[3]]`, cioè il punto x -1, y 3.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | **a** o **b** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | In **a** o **b** le righe hanno lunghezze diverse, o la prima è vuota. |
| La matrice deve contenere solo numeri | Una cella non è un numero. |
| Prodotto impossibile: le colonne di A (K) devono essere quante le righe di B (N) | Le colonne di **a** non sono quante le righe di **b**. |
| Matrice troppo grande (massimo 100000 celle) | Il risultato avrebbe più di 100000 celle. |

## Vedi anche

- [Trasposta](coll.matTranspose), [Identità](coll.matIdentity), [Scala](coll.matScale), [Determinante](coll.matDet)
- [Come funziona un blocco](ide/blocks)
