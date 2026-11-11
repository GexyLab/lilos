# Piramide retta regolare

`solid.pyramid` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Una piramide retta con per base un poligono regolare: dal numero di lati, dal lato e dall'altezza calcola volume, aree, apotema e spigolo laterale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lati della base** (`n`) | numero | Quanti lati ha la base: un intero da 3 a 1000. |
| **lato** (`side`) | numero | Il lato della base. |
| **altezza** (`h`) | numero | L'altezza della piramide (dal vertice al centro della base). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **area di base** (`base`) | numero | L'area di base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **apotema** (`slant`) | numero | L'apotema della piramide: l'altezza di una faccia laterale. |
| **spigolo laterale** (`edge`) | numero | Lo spigolo laterale (da un vertice della base al vertice in alto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con *n* lati di lunghezza *s* e altezza *h*, e per la base apotema *a* = s / (2·tan(π/n)) e raggio *R* = s / (2·sin(π/n)):

- area di base B = n·s² / (4·tan(π/n))
- volume V = B·h / 3
- apotema della piramide = √(h² + a²)
- area laterale = n·s·apotema / 2; area totale = B + area laterale
- spigolo laterale = √(h² + R²)

## Esempi

### 1. La piramide a base quadrata (lato 6, altezza 4)

```
[Costante · Variabile: 4] valore ──▶ lati della base  [Piramide retta regolare] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 6] valore ──▶ lato                                       apotema ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ altezza                                    area totale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
48
5
96
```

### 2. Una piramide a base triangolare (lato 2, altezza 1,5)

```
[Costante · Variabile: 3] valore ──▶ lati della base  [Piramide retta regolare] area di base ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ lato                                       volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 1.5] valore ──▶ altezza                                  spigolo laterale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
1.73205080756888
0.866025403784439
1.89296944860009
```

Lo spigolo laterale e l'area di base sono nascosti di serie.

## Errori

| Messaggio | Quando |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| Il numero di lati deve essere un intero da 3 a 1000 | I **lati della base** non sono un intero da 3 a 1000. |

## Vedi anche

- [Tronco di piramide regolare](solid.frustumPyramid) la piramide tagliata
- [Prisma retto regolare](solid.prism) il prisma con la stessa base
- [Poliedri regolari](solid.polyhedron) il tetraedro regolare ha tutte le facce uguali
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
