# Matrice di trasformazione (3×3)

`plane.matrix` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

La **matrice di trasformazione** omogenea 3×3 di una trasformazione del piano, o di più messe insieme.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice di base** (`base`) | matrice | Una matrice 3×3 da cui partire. Facoltativa. |
| **vettore [x, y]** (`vector`) | lista | Traslazione: lo spostamento `[dx, dy]`. Scala: i fattori `[sx, sy]`. Shear: i fattori `[kx, ky]`. |
| **centro [x, y]** (`center`) | lista | Il centro della rotazione, della scala o dello shear; il punto di una riflessione. Se manca è l'origine `[0, 0]`. |
| **angolo** (`angle`) | numero | L'angolo di rotazione, positivo in senso antiorario. Se non è collegato vale l'impostazione **Angolo**. |
| **fattore** (`factor`) | numero | La scala uniforme. Se non è collegato (e non c'è **vector**) vale l'impostazione **Fattore**. |
| **retta** (`line`) | oggetto | La retta della riflessione (una retta di [Retta per due punti](plane.line), una lista di due punti o `{a, b, c}`). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice: una lista di tre righe, compatibile con i blocchi per matrici di [Liste e matrici](logicstudio-collections). Con le colonne: `M × [x, y, 1]`. |
| **Exception** (`error`) | oggetto | Una matrice non è 3×3, manca un dato della trasformazione, o un valore non è un punto. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più, di tipo matrice, chiamati con le lettere. Sono le matrici da comporre.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Trasformazione** (`op`) | Nessuna (solo compone) / Traslazione / Rotazione / Scala / Riflessione su una retta / Riflessione rispetto a un punto / Taglio (shear) | Nessuna (solo compone) | La trasformazione propria del blocco, o **Nessuna** per comporre soltanto. Come in [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform). |
| **Angolo (se non collegato)** (`angle`) | un numero | 90 | L'angolo di rotazione quando **angle** non è collegato. |
| **Fattore (se non collegato)** (`factor`) | un numero | 2 | Il fattore di scala quando **factor** e **vector** non sono collegati. |
| **Unità degli angoli** (`unit`) | Gradi (°) / Radianti (rad) / Gradi centesimali (gon) | Gradi (°) | L'unità degli angoli. |

## Come funziona

Una trasformazione si scrive come una matrice che si moltiplica per le coordinate del punto, con un 1 in più in fondo (coordinate omogenee). Per il piano:

```
| 1 0 tx |     traslazione
| 0 1 ty |
| 0 0 1  |

| cos -sin 0 |     rotazione
| sin  cos 0 |
|  0    0  1 |
```

Più trasformazioni in fila si **compongono** moltiplicando le matrici. L'ordine è questo: prima si applica **base**, poi le matrici delle porte aggiunte (nell'ordine delle Proprietà), per ultima la trasformazione propria del blocco (se non è **Nessuna**). La matrice risultante fa tutto in un solo passo; si applica con [Applica matrice](plane.apply).

Le matrici sono sempre 3×3: per lo spazio (matrici 4×4) non c'è un blocco qui, ma i blocchi di [Liste e matrici](logicstudio-collections) moltiplicano matrici di qualsiasi misura.

## Esempi

### 1. Una rotazione di 90 gradi

```
[Costante: 90] valore ──▶ angle [Matrice di trasformazione: Rotazione] matrice ──▶ valore [Print (console.log)]
```

Esce `[[0, -1, 0], [1, 0, 0], [0, 0, 1]]`. Una traslazione di `[2, 3]` dà `[[1, 0, 2], [0, 1, 3], [0, 0, 1]]`.

### 2. Prima traslare, poi ruotare

```
[Matrice: traslazione (2, 3)] matrice ──▶ base [Matrice di trasformazione: Nessuna]
[Matrice: rotazione 90°]      matrice ──▶ (porta aggiunta) [Matrice di trasformazione: Nessuna] matrice ──▶ matrix [Applica matrice]
[Punto: (1, 0)] punto ──▶ target [Applica matrice] risultato ──▶ valore [Print (console.log)]
```

La matrice composta è `[[0, -1, -3], [1, 0, 2], [0, 0, 1]]` e il punto `(1, 0)` va prima in `(3, 3)` e poi in `[-3, 3]`. Scambiando l'ordine si ottiene un altro risultato: ruotare prima o dopo una traslazione non è la stessa cosa.

## Errori

| Messaggio | Quando |
|---|---|
| Non è una matrice di trasformazione 3×3 | La matrice non è quadrata 3×3, o ha celle che non sono numeri. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Manca il vettore | Con traslazione o shear: **vector** non è collegato. |
| Manca la retta di simmetria | Con la riflessione su una retta: **line** non è collegata. |
| Non è una retta: «…» | Il valore non è una retta: serve la retta di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`. |
| Trasformazione sconosciuta: «…» | L'impostazione **Trasformazione** non è valida (un progetto salvato male). |
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |

## Vedi anche

- [Applica matrice](plane.apply) per applicare la matrice
- [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) per una sola trasformazione, in un passo
- [A × B](coll.matMultiply), [Transpose](coll.matTranspose) e [Identità (eye)](coll.matIdentity) per lavorare con le matrici in generale
- [Come funziona un blocco](ide/blocks)
