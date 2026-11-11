# A + B

`coll.matAdd` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Somma due matrici della stessa misura, cella per cella.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | matrice | La prima matrice. Solo numeri. |
| **b** | matrice | La seconda matrice, con le stesse righe e colonne di **a**. Solo numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | matrice | La matrice in cui ogni cella è la somma delle celle nella stessa posizione di **a** e **b**. |
| **Exception** (`error`) | oggetto | Matrice non valida, celle non numeriche, misure diverse. |

## Come funziona

Il blocco aspetta di avere **a** e **b**; poi, a ogni valore nuovo su uno dei due, manda la somma: la cella in riga *i* e colonna *j* del risultato è `a[i][j] + b[i][j]`.

- Tutte e due devono essere matrici valide (vedi [Shape](coll.matSize)).
- **Le celle devono essere numeri veri**: un testo come `"2"` dà «La matrice deve contenere solo numeri» (a differenza dei blocchi delle liste, qui i testi non vengono convertiti). Anche `null`, `true` e celle vuote danno lo stesso errore.
- Le due matrici devono avere le stesse righe e colonne, altrimenti esce per esempio «Le matrici devono avere le stesse dimensioni (2×3 e 2×2)».
- Il risultato non viene arrotondato: `0.1 + 0.2` dà `0.30000000000000004`.

## Esempi

### 1. Due matrici 2 × 3

```
[Costante · Variabile (JSON): [[1,2,3],[4,5,6]]]       valore ──▶ a  [A + B] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile (JSON): [[10,20,30],[40,50,60]]] valore ──▶ b
```

Scrive `[[11,22,33],[44,55,66]]`.

### 2. Misure diverse

Con **a** = `[[1,2,3],[4,5,6]]` e **b** = `[[1,2],[3,4]]` non esce nessun risultato e arriva l'errore «Le matrici devono avere le stesse dimensioni (2×3 e 2×2)».

### 3. Un testo in una cella

Con **a** = `[[1,"2"]]` e **b** = `[[1,2]]` esce «La matrice deve contenere solo numeri». Se i numeri arrivano come testo (per esempio da [Split](coll.split)), convertili prima uno per uno o costruisci la matrice da numeri.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | **a** o **b** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | In **a** o **b** le righe hanno lunghezze diverse, o la prima è vuota. |
| La matrice deve contenere solo numeri | Una cella non è un numero. |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) | **a** e **b** hanno righe o colonne diverse; al posto di R e C ci sono le misure vere. |

## Vedi anche

- [A − B](coll.matSubtract), [Scala (k·A)](coll.matScale), [A × B](coll.matMultiply)
- [Come funziona un blocco](ide/blocks)
