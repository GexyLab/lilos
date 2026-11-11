# Rettangolo di ingombro

`plane.bounds` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Il **rettangolo di ingombro** (*bounding box*) di punti o figure: gli angoli minimo e massimo, larghezza, altezza e il rettangolo come figura.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti o figure** (`points`) | qualsiasi | Un punto, una figura, o una lista di punti e di figure insieme. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **rettangolo** (`rect`) | oggetto | Il rettangolo come figura `{kind: "rect", x, y, width, height, min, max}`. |
| **min** | lista | L'angolo con le coordinate più piccole, una lista `[x, y]`. |
| **max** | lista | L'angolo con le coordinate più grandi, una lista `[x, y]`. |
| **larghezza** (`width`) | numero | La larghezza (x massima - x minima). |
| **altezza** (`height`) | numero | L'altezza (y massima - y minima). |
| **centro** (`center`) | lista | Il centro del rettangolo, una lista `[x, y]`. |
| **area** | numero | L'area `larghezza × altezza`. |
| **Exception** (`error`) | oggetto | Un valore non è un punto né una figura, o la lista è vuota. |

## Come funziona

Di un cerchio contano il centro ± il raggio; di un'ellisse il suo rettangolo esatto (anche ruotata); di un poligono i vertici; di una retta i due punti che la definiscono; di una parabola e di un'iperbole un tratto di curva vicino al vertice. Di un solo punto il rettangolo ha larghezza e altezza 0. Il calcolo è nel piano: la z di un punto 3D si ignora.

## Esempi

### 1. Una nuvola di punti

```
[Lista: (1,2) (5,-1) (3,8)] lista ──▶ points [Rettangolo di ingombro] larghezza ──▶ valore [Print (console.log)]
```

**min** `[1, -1]`, **max** `[5, 8]`, larghezza `4`, altezza `9`, area `36`, centro `[3, 3.5]`.

### 2. Figure e punti insieme

La lista del cerchio di centro `(0, 0)` e raggio 2 con il punto `(5, 5)` ha **min** `[-2, -2]` e **max** `[5, 5]`. Con un solo punto `(7, 7)` larghezza, altezza e area sono `0`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto né una figura: «…» | Il valore non è un punto, una lista di punti o una figura. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Figura sconosciuta: «…» | Una figura ha un `kind` che il blocco non conosce. |
| Serve almeno un punto | La lista è vuota. |

## Vedi anche

- [Punto dentro figura](plane.inside) per controllare un punto nel rettangolo
- [Inviluppo convesso](plane.hull) per l'inviluppo convesso
- [Figura → SVG](plane.svg) per disegnare
- [Come funziona un blocco](ide/blocks)
