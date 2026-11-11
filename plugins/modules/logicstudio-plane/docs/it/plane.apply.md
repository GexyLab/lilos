# Applica matrice

`plane.apply` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

**Applica una matrice** di trasformazione 3×3 a un punto, a una lista di punti o a una figura.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto, punti o figura** (`target`) | qualsiasi | Quello da trasformare: un punto, una lista di punti o di figure, o una figura. |
| **matrice** (`matrix`) | matrice | La matrice 3×3, per esempio quella di [Matrice di trasformazione (3×3)](plane.matrix). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il risultato, dello stesso tipo di **target** (i punti sono liste `[x, y]`). |
| **Exception** (`error`) | oggetto | La matrice non è valida, un punto sarebbe mandato all'infinito, o il valore non è un punto né una figura. |

## Come funziona

Ogni punto `(x, y)` diventa il prodotto della matrice per `[x, y, 1]`. Se l'ultima riga della matrice non è `[0, 0, 1]` le coordinate si dividono per la terza componente, come in una prospettiva; se questa è zero il punto non ha una posizione e il blocco dà un errore.

Le figure si trasformano come descritto in [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform): poligoni e rette punto per punto; cerchi ed ellissi solo con traslazioni, rotazioni, riflessioni e scale uniformi; rettangoli che restano tali con traslazioni e scale.

## Esempi

### 1. Raddoppiare una lista di punti

```
[Lista: (1,1) (2,2)]   lista  ──▶ target [Applica matrice]
[Matrice 3×3: scala 2] matrice ──▶ matrix [Applica matrice] risultato ──▶ valore [Print (console.log)]
```

Con `[[2, 0, 0], [0, 2, 0], [0, 0, 1]]` esce `[[2, 2], [4, 4]]`.

### 2. Una traslazione e una divisione

| target | matrice | Esce |
|---|---|---|
| `[1, 1]` | `[[1, 0, 5], [0, 1, 0], [0, 0, 1]]` (traslazione `[5, 0]`) | `[6, 1]` |
| `[2, 4]` | `[[1, 0, 0], [0, 1, 0], [0, 0, 2]]` | `[1, 2]` (divisione per 2) |

## Errori

| Messaggio | Quando |
|---|---|
| Non è una matrice di trasformazione 3×3 | La matrice non è quadrata 3×3, o ha celle che non sono numeri. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un punto né una figura: «…» | Il valore non è un punto, una lista di punti o una figura. |
| La matrice manda un punto all'infinito | L'ultima riga della matrice dà zero per quel punto. |
| Questa trasformazione deforma il cerchio: non resta un cerchio | Un cerchio con una matrice che non è una similitudine. |
| Questa figura non si può trasformare: «…» | Una parabola o un'iperbole. |

## Vedi anche

- [Matrice di trasformazione (3×3)](plane.matrix) per costruire e comporre le matrici
- [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) per una trasformazione in un solo blocco
- [Come funziona un blocco](ide/blocks)
