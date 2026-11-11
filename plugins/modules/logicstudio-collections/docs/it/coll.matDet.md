# Det

`coll.matDet` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Calcola il determinante di una matrice quadrata, fino a 10 × 10.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | Una matrice quadrata (tante righe quante colonne), da 1 × 1 a 10 × 10. Solo numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **determinante** (`det`) | numero | Il determinante. |
| **Eccezione** (`error`) | oggetto | Matrice non valida, non quadrata, troppo grande o con celle non numeriche. |

## Come funziona

A ogni matrice che arriva il blocco calcola il determinante e lo manda su **determinante**.

- La matrice deve essere **quadrata**: `[[1,2,3]]` dà «La matrice deve essere quadrata».
- Al massimo **10 × 10**: una matrice 11 × 11 dà «Determinante: al massimo 10×10».
- **Le celle devono essere numeri veri**: un testo come `"2"` dà «La matrice deve contenere solo numeri».
- Il determinante di una matrice 1 × 1 è il suo unico valore.
- Il calcolo usa l'eliminazione di Gauss (con lo scambio di righe per la precisione) e arrotonda il risultato a 12 cifre significative, così `[[0.1,0.2],[0.3,0.4]]` dà `-0.02` e non `-0.020000000000000004`.

**Precisione.** Il calcolo è fatto con i numeri con la virgola del computer: una matrice il cui determinante è esattamente 0 può dare un numero piccolissimo invece di 0. Per esempio `[[1,2,3],[4,5,6],[7,8,9]]` (determinante 0) dà `6.66133814775e-16`. Per sapere se una matrice è «singolare», confronta il valore assoluto del risultato con una soglia piccola (per esempio 1e-9) invece di confrontarlo con 0. Con numeri molto grandi il risultato può diventare `Infinity`, con numeri molto piccoli 0.

## Esempi

### 1. Una matrice 2 × 2

```
[Costante · Variabile (JSON): [[1,2],[3,4]]] valore ──▶ matrice [Det] determinante ──▶ valore [Print (console.log)]
```

Scrive `-2` (1×4 − 2×3).

### 2. Una matrice diagonale e uno scambio di righe

- `[[2,0,0],[0,3,0],[0,0,4]]` → `24` (il prodotto della diagonale);
- `[[0,1],[1,0]]` → `-1`;
- `[[1,2],[2,4]]` → `0` (la seconda riga è il doppio della prima).

### 3. Il sistema ha una soluzione sola?

Un sistema di equazioni lineari ha una soluzione sola quando il determinante della matrice dei coefficienti non è 0:

```
[Costante · Variabile (JSON): [[2,1],[1,3]]] valore ──▶ matrice [Det] determinante ──▶ valore [Funzioni Math: valore assoluto] risultato ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ accesa [Spia]
                                                                                                          [Costante · Variabile: 1e-9] valore ──▶ b
```

Il determinante è 5: la [Spia](ui.lamp) si accende.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| La matrice deve contenere solo numeri | Una cella non è un numero. |
| La matrice deve essere quadrata | Righe e colonne sono di numero diverso. |
| Determinante: al massimo 10×10 | La matrice è più grande di 10 × 10. |

## Vedi anche

- [A × B](coll.matMultiply), [Identità (eye)](coll.matIdentity), [Transpose](coll.matTranspose)
- [Funzioni Math](core.math), [Confronto (== ≠ < >)](core.compare)
- [Come funziona un blocco](ide/blocks)
