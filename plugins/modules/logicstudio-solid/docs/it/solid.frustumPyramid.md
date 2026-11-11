# Tronco di piramide regolare

`solid.frustumPyramid` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Il tronco di una piramide regolare (tagliata parallelamente alla base): da lati delle due basi e altezza calcola volume, aree, apotema e spigolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lati delle basi** (`n`) | numero | Quanti lati hanno le basi: un intero da 3 a 1000. |
| **lato della base maggiore** (`L`) | numero | Il lato della base maggiore. |
| **lato della base minore** (`l`) | numero | Il lato della base minore (non più grande del lato maggiore). |
| **altezza** (`h`) | numero | L'altezza del tronco (la distanza tra le due basi). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **apotema** (`slant`) | numero | L'apotema del tronco: l'altezza di una faccia laterale (un trapezio). |
| **spigolo laterale** (`edge`) | numero | Lo spigolo laterale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **area della base maggiore** (`base`) | numero | L'area della base maggiore. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **area della base minore** (`top`) | numero | L'area della base minore. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con *n* lati, lato maggiore *L*, lato minore *l*, altezza *h*; le aree delle basi *B₁* e *B₂* e i loro apotemi *a₁*, *a₂* e raggi *R₁*, *R₂* sono quelli dei poligoni regolari (n·s² / (4·tan(π/n)), s / (2·tan(π/n)), s / (2·sin(π/n))):

- volume V = h/3 · (B₁ + B₂ + √(B₁·B₂))
- apotema = √(h² + (a₁ − a₂)²)
- area laterale = n·(L + l)·apotema / 2; area totale = area laterale + B₁ + B₂
- spigolo laterale = √(h² + (R₁ − R₂)²)

Con *l* = *L* il tronco diventa un prisma.

## Esempi

### 1. Un tronco a base quadrata (lati 6 e 3, altezza 4)

```
[Costante · Variabile: 4] valore ──▶ lati delle basi           [Tronco di piramide regolare] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 6] valore ──▶ lato della base maggiore                                apotema ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ lato della base minore                                  area totale ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ altezza
```

Scrive queste righe, una per uscita:

```
84
4.27200187265877
121.896033707858
```

### 2. Un tronco esagonale (lati 4 e 2, altezza 3)

```
[Costante · Variabile: 6] valore ──▶ lati delle basi           [Tronco di piramide regolare] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ lato della base maggiore                                area laterale ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ lato della base minore                                  spigolo laterale ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ altezza
```

Scrive queste righe, una per uscita:

```
72.7461339178928
62.3538290724796
3.60555127546399
```

## Errori

| Messaggio | Quando |
|---|---|
| lato della base maggiore: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| lato della base minore: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| Il numero di lati deve essere un intero da 3 a 1000 | I **lati delle basi** non sono un intero da 3 a 1000. |
| Il lato della base minore non può superare quello della base maggiore | Il lato minore è più grande del lato maggiore. |

## Vedi anche

- [Piramide retta regolare](solid.pyramid) la piramide intera
- [Tronco di cono](solid.frustum) il tronco di cono
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
