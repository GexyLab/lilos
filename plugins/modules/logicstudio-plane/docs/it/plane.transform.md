# Trasforma (trasla · ruota · scala · rifletti · taglia)

`plane.transform` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

**Trasforma** un punto, una lista di punti o una figura nel piano: la sposta, la ruota, la ingrandisce, la riflette o la deforma (*shear*).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto, punti o figura** (`target`) | qualsiasi | Quello da trasformare: un punto, una lista di punti o di figure, o una figura. |
| **vettore [x, y]** (`vector`) | lista | Traslazione: lo spostamento `[dx, dy]`. Scala: i fattori `[sx, sy]`. Shear: i fattori `[kx, ky]`. |
| **centro [x, y]** (`center`) | lista | Il centro della rotazione, della scala o dello shear; il punto di una riflessione. Se manca è l'origine `[0, 0]`. |
| **angolo** (`angle`) | numero | L'angolo di rotazione, positivo in senso antiorario. Se non è collegato vale l'impostazione **Angolo**. |
| **fattore** (`factor`) | numero | La scala uniforme. Se non è collegato (e non c'è **vector**) vale l'impostazione **Fattore**. |
| **retta** (`line`) | oggetto | La retta della riflessione (una retta di [Retta per due punti](plane.line), una lista di due punti o `{a, b, c}`). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il risultato, dello stesso tipo di **target**: un punto (sempre una lista `[x, y]`), una lista, una figura. |
| **Exception** (`error`) | oggetto | Manca un dato, un valore non è un punto o una figura, o la trasformazione deforma una figura che deve restare com'è. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Trasformazione** (`op`) | Traslazione / Rotazione / Scala / Riflessione su una retta / Riflessione rispetto a un punto / Taglio (shear) | Rotazione | La trasformazione. Vedi la tabella sotto. |
| **Angolo (se non collegato)** (`angle`) | un numero | 90 | L'angolo di rotazione quando **angle** non è collegato. |
| **Fattore (se non collegato)** (`factor`) | un numero | 2 | Il fattore di scala quando **factor** e **vector** non sono collegati. |
| **Unità degli angoli** (`unit`) | Gradi (°) / Radianti (rad) / Gradi centesimali (gon) | Gradi (°) | L'unità degli angoli. |

## Come funziona

| Trasformazione | Serve | Cosa fa |
|---|---|---|
| Traslazione | **vector** | Sposta di `[dx, dy]`. |
| Rotazione | **angle** (o l'impostazione), **center** (facoltativo) | Ruota attorno al centro, in senso antiorario. |
| Scala | **factor** (o l'impostazione) oppure **vector**, **center** (facoltativo) | Ingrandisce o rimpicciolisce rispetto al centro; un fattore negativo ruota di 180°. |
| Riflessione su una retta | **line** | Specchia rispetto alla retta. |
| Riflessione rispetto a un punto | **center** | Specchia attraverso il punto (simmetria centrale). |
| Shear | **vector** = `[kx, ky]`, **center** (facoltativo) | `x' = x + kx·y`, `y' = y + ky·x`. |

Dietro c'è una matrice 3×3: la stessa di [Matrice di trasformazione (3×3)](plane.matrix), applicata come fa [Applica matrice](plane.apply). Per spostare e ruotare punti nello spazio c'è [Trasforma punti (sposta, scala, ruota)](solid.transform).

Cosa succede alle figure: i **poligoni** e le **rette** si trasformano punto per punto. Un **cerchio** o un'**ellisse** restano tali con traslazione, rotazione, riflessione e scala uniforme (con altre trasformazioni, come lo shear o una scala diversa su x e y, il cerchio non resterebbe un cerchio e il blocco dà un errore). Un **rettangolo** resta rettangolo con traslazione e scala dei lati; con una rotazione diventa un poligono. **Parabola** e **iperbole** si possono solo disegnare, non trasformare.

## Esempi

### 1. Ruotare un punto

```
[Punto: (1, 0)] punto ──▶ target [Trasforma: Rotazione]
[Costante: 90] valore ──▶ angle [Trasforma: Rotazione] risultato ──▶ valore [Print (console.log)]
```

Esce `[0, 1]`. Con **center** = `(1, 1)` e angolo 180, il punto `(2, 1)` va in `[0, 1]`.

### 2. Altre trasformazioni

| Trasformazione | target | Ingressi | Esce |
|---|---|---|---|
| Traslazione | `{x: 1, y: 2}` | vector `[3, 4]` | `[4, 6]` |
| Scala | `[1, 1]` | factor 3, center `[1, 0]` | `[1, 3]` |
| Riflessione su una retta | `[1, 2]` | line per `[0, 0]` e `[1, 1]` | `[2, 1]` |
| Riflessione rispetto a un punto | `[1, 2]` | center `[0, 0]` | `[-1, -2]` |
| Shear | `[1, 2]` | vector `[1, 0]` | `[3, 2]` |

Una lista di punti `[[0, 0], [1, 1]]` con la traslazione `[1, 1]` dà la lista `[[1, 1], [2, 2]]`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un punto né una figura: «…» | Il valore non è un punto, una lista di punti o una figura. |
| Non è una retta: «…» | Il valore non è una retta: serve la retta di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`. |
| Manca il vettore | Con traslazione o shear: **vector** non è collegato. |
| Manca la retta di simmetria | Con la riflessione su una retta: **line** non è collegata. |
| Questa trasformazione deforma il cerchio: non resta un cerchio | Un cerchio con uno shear o una scala diversa su x e y. |
| Questa trasformazione deforma l'ellisse: serve una traslazione, una rotazione, una riflessione o una scala uniforme | Un'ellisse con uno shear o una scala diversa su x e y. |
| Questa figura non si può trasformare: «…» | Una parabola o un'iperbole. |
| Trasformazione sconosciuta: «…» | L'impostazione **Trasformazione** non è valida (un progetto salvato male). |

## Vedi anche

- [Matrice di trasformazione (3×3)](plane.matrix) e [Applica matrice](plane.apply) per comporre più trasformazioni in una matrice
- [Trasforma punti (sposta, scala, ruota)](solid.transform) per spostare, scalare e ruotare punti nello spazio
- [Figura → SVG](plane.svg) per disegnare il risultato
- [Come funziona un blocco](ide/blocks)
