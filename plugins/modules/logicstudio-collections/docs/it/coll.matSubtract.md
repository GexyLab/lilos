# A − B

`coll.matSubtract` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Sottrae la seconda matrice dalla prima, cella per cella.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | matrice | La matrice da cui sottrarre. Solo numeri. |
| **b** | matrice | La matrice da sottrarre, con le stesse righe e colonne di **a**. Solo numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | matrice | La matrice in cui ogni cella è `a − b` nella stessa posizione. |
| **Eccezione** (`error`) | oggetto | Matrice non valida, celle non numeriche, misure diverse. |

## Come funziona

Il blocco aspetta di avere **a** e **b**; poi, a ogni valore nuovo su uno dei due, manda la differenza: la cella in riga *i* e colonna *j* del risultato è `a[i][j] − b[i][j]`. L'ordine conta: **a − b** non è **b − a**.

Valgono le stesse regole di [A + B](coll.matAdd):

- matrici valide, con **celle che sono numeri veri** (un testo come `"2"` dà «La matrice deve contenere solo numeri»);
- stesse righe e colonne, altrimenti per esempio «Le matrici devono avere le stesse dimensioni (1×2 e 2×1)»;
- risultato non arrotondato.

## Esempi

### 1. Una riga

```
[Costante · Variabile (JSON): [[5,5]]] valore ──▶ a  [A − B] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile (JSON): [[1,2]]] valore ──▶ b
```

Scrive `[[4,3]]`.

### 2. Quanto è cambiato

Con le vendite di due mesi per negozio e prodotto, **a** = `[[12,9],[14,7]]` (questo mese) e **b** = `[[10,9],[15,4]]` (il mese prima), il risultato `[[2,0],[-1,3]]` dice di quanto è cresciuta (o calata) ogni vendita.

### 3. Misure diverse

**a** = `[[1,2]]` e **b** = `[[1],[2]]` danno «Le matrici devono avere le stesse dimensioni (1×2 e 2×1)». Per sottrarre una colonna da una riga, prima trasponi con [Transpose](coll.matTranspose).

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | **a** o **b** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | In **a** o **b** le righe hanno lunghezze diverse, o la prima è vuota. |
| La matrice deve contenere solo numeri | Una cella non è un numero. |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) | **a** e **b** hanno righe o colonne diverse. |

## Vedi anche

- [A + B](coll.matAdd), [Scala (k·A)](coll.matScale) (con fattore -1 cambia il segno di tutte le celle)
- [Come funziona un blocco](ide/blocks)
