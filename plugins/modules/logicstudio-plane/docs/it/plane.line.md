# Retta per due punti

`plane.line` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

La **retta** per due punti: i coefficienti `a`, `b`, `c`, la pendenza, l'intercetta e l'equazione scritta. Le rette verticali sono gestite.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto 1 [x, y]** (`p`) | lista | Il primo punto. |
| **punto 2 [x, y]** (`q`) | lista | Il secondo punto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **retta** (`line`) | oggetto | La retta come figura (`{kind: "line", a, b, c, p1, p2}`), da dare a [Parallela · Perpendicolare](plane.parallel), [Intersezione](plane.intersect), [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) e [Figura → SVG](plane.svg). |
| **a** | numero | Il coefficiente **a** di `a·x + b·y + c = 0`. |
| **b** | numero | Il coefficiente **b**. |
| **c** | numero | Il coefficiente **c**. |
| **pendenza m** (`slope`) | numero | La pendenza **m** di `y = m·x + q`, oppure `null` se la retta è verticale. |
| **intercetta q** (`intercept`) | numero | L'intercetta **q** (dove la retta taglia l'asse y), oppure `null` se la retta è verticale. |
| **verticale** (`vertical`) | sì/no | **sì** se la retta è verticale. |
| **equazione** (`equation`) | testo | L'equazione come testo: `y = 2x + 1`, oppure `x = 3` per una retta verticale. |
| **Exception** (`error`) | oggetto | Un valore non è un punto, o i due punti coincidono. |

## Come funziona

Per i punti (x1, y1) e (x2, y2) il blocco calcola `a = y2 - y1`, `b = x1 - x2` e `c = -(a·x1 + b·y1)`, così la retta è `a·x + b·y + c = 0`. I coefficienti non sono ridotti: per `(0, 1)` e `(2, 5)` escono `4`, `-2`, `2` (e non `2`, `-1`, `1`).

Se `b` è zero la retta è **verticale**: **pendenza** e **intercetta** sono `null` e l'equazione è `x = k`. Lavora in 2D: la z dei punti non conta.

## Esempi

### 1. Una retta qualsiasi

```
[Punto: (0, 1)] punto ──▶ p [Retta per due punti]
[Punto: (2, 5)] punto ──▶ q [Retta per due punti] equazione ──▶ valore [Print (console.log)]
```

Esce `y = 2x + 1`, con pendenza `2` e intercetta `1`.

### 2. Casi particolari

| p | q | equazione | pendenza | verticale |
|---|---|---|---|---|
| `(3, 0)` | `(3, 7)` | `x = 3` | `null` | sì |
| `(0, 2)` | `(5, 2)` | `y = 2` | `0` | no |
| `(0, 0)` | `(1, -1)` | `y = -x` | `-1` | no |
| `(0, 3)` | `(1, 2)` | `y = -x + 3` | `-1` | no |

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| I due punti coincidono: non definiscono una retta | I due punti sono lo stesso punto. |

## Vedi anche

- [Parallela · Perpendicolare](plane.parallel) per una parallela o una perpendicolare
- [Asse · Bisettrice](plane.bisector) per l'asse di un segmento
- [Intersezione](plane.intersect) per trovare dove due rette si incontrano
- [Distanza (Math.hypot)](plane.distance) per la distanza di un punto dalla retta
- [Come funziona un blocco](ide/blocks)
