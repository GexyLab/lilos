# Parallela · Perpendicolare

`plane.parallel` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

La **parallela** o la **perpendicolare** a una retta data, che passa per un punto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **retta** (`line`) | oggetto | La retta (di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`). |
| **punto [x, y]** (`point`) | lista | Il punto da cui deve passare la nuova retta. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **nuova retta** (`line`) | oggetto | La nuova retta, come figura. |
| **a** | numero | Il coefficiente **a** della nuova retta. |
| **b** | numero | Il coefficiente **b**. |
| **c** | numero | Il coefficiente **c**. |
| **equazione** (`equation`) | testo | L'equazione come testo (`y = x + 3`, `x = 5`). |
| **piede (perpendicolare)** (`foot`) | lista | Il «piede»: il punto della retta data più vicino a **point** (dove la perpendicolare la incontra). Esce sempre, anche per la parallela. |
| **Exception** (`error`) | oggetto | La retta non è valida, o il punto non è un punto. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **La retta è** (`mode`) | Parallela / Perpendicolare | Parallela | Parallela o perpendicolare alla retta data. |

## Come funziona

La **parallela** ha la stessa direzione della retta data. La **perpendicolare** forma con essa un angolo retto. In tutti e due i casi passa per **point**. Una retta orizzontale ha come perpendicolare una verticale (`x = k`) e viceversa.

## Esempi

### 1. La parallela

```
[Retta per due punti: (0,0) (1,1)] retta ──▶ line [Parallela · Perpendicolare: Parallela]
[Punto: (0, 3)] punto ──▶ point [Parallela · Perpendicolare: Parallela] equazione ──▶ valore [Print (console.log)]
```

Esce `y = x + 3`.

### 2. La perpendicolare e il piede

Con la stessa retta `y = x`, **Perpendicolare** e il punto `(0, 2)`: equazione `y = -x + 2` e piede `[1, 1]` (dove la perpendicolare taglia `y = x`). Con la retta per `(0, 0)` e `(1, 0)` (l'asse x) e il punto `(5, 5)` si ottiene `x = 5`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è una retta: «…» | Il valore non è una retta: serve la retta di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è una retta: «a e b sono zero» | L'oggetto `{a, b, c}` ha **a** e **b** uguali a zero. |

## Vedi anche

- [Retta per due punti](plane.line) per costruire la retta di partenza
- [Asse · Bisettrice](plane.bisector) per l'asse di un segmento (perpendicolare per il punto medio)
- [Distanza (Math.hypot)](plane.distance) per la distanza di un punto dalla retta
- [Come funziona un blocco](ide/blocks)
