# Distanza punto–piano

`solid.planeDistance` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

La distanza di un punto da un piano, con il segno, e la proiezione del punto sul piano.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **piano** (`plane`) | qualsiasi | Il piano: un oggetto `{a, b, c, d}` (per ax + by + cz + d = 0) o una lista `[a, b, c, d]`. È l'uscita di [Piano per 3 punti](solid.plane). |
| **punto** (`point`) | lista | Il punto: lista `[x, y, z]` o oggetto `{x, y, z}`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **distanza** (`distance`) | numero | La distanza (sempre ≥ 0). |
| **distanza con segno** (`signed`) | numero | La distanza con segno: positiva dal lato verso cui punta la normale (a, b, c), negativa dall'altro. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **proiezione sul piano** (`projection`) | lista | Il punto del piano più vicino a P (la proiezione perpendicolare). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Con piano ax + by + cz + d = 0, normale n = (a, b, c) e punto P:

- distanza con segno s = (n·P + d) / |n|; distanza = |s|
- proiezione = P − (s / |n|)·n

Il blocco aspetta piano e punto. I coefficienti non devono essere tutti 0 per a, b, c.

## Esempi

### 1. Il punto (1, 2, 8) dal piano z = 5

```
[Costante · Variabile: {"a":0,"b":0,"c":1,"d":-5}] valore ──▶ piano  [Distanza punto–piano] distanza ──▶ valore [Print (console.log)]
[Costante · Variabile: [1,2,8]] valore ──▶ punto                                            proiezione sul piano ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
3
[1,2,5]
```

### 2. Un piano come lista [a, b, c, d]: x + y + z = 3

```
[Costante · Variabile: [1,1,1,-3]] valore ──▶ piano  [Distanza punto–piano] distanza ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,0,0]] valore ──▶ punto                            distanza con segno ──▶ valore [Print (console.log)]
                                                                            proiezione sul piano ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
1.73205080756888
-1.73205080756888
[1,1,1]
```

La distanza con segno è nascosta di serie. Il punto (0, 0, 0) sta dal lato opposto alla normale (1, 1, 1): per questo il segno è negativo.

## Errori

| Messaggio | Quando |
|---|---|
| piano: serve un oggetto { a, b, c, d } o una lista [a, b, c, d] | L'ingresso **piano** non è un oggetto né una lista. |
| piano: a, b, c e d devono essere numeri | Uno dei quattro coefficienti non è un numero. |
| piano: a, b e c non possono essere tutti 0 | a, b e c sono tutti 0: non è un piano. |
| punto: serve un punto o un vettore [x, y, z] | Il punto non è una lista di 3 (o 2) elementi né un oggetto. |

## Vedi anche

- [Piano per 3 punti](solid.plane) per ottenere il piano da tre punti
- [Intersezione retta–piano](solid.linePlane) dove una retta incontra il piano
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
