# Prisma retto regolare

`solid.prism` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un prisma retto con per base un poligono regolare: dal numero di lati, dal lato e dall'altezza calcola volume, aree e apotema di base.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lati della base** (`n`) | numero | Quanti lati ha la base: un intero da 3 a 1000. |
| **lato** (`side`) | numero | Il lato della base. |
| **altezza** (`h`) | numero | L'altezza del prisma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **area di base** (`base`) | numero | L'area di base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **perimetro di base** (`perimeter`) | numero | Il perimetro della base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **apotema di base** (`apothem`) | numero | L'apotema della base (dal centro al punto medio di un lato). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con *n* lati di lunghezza *s* e altezza *h*:

- area di base B = n·s² / (4·tan(π/n))
- apotema di base = s / (2·tan(π/n)); perimetro = n·s
- volume V = B·h
- area laterale = n·s·h; area totale = n·s·h + 2B

## Esempi

### 1. Un prisma esagonale, lato 2, altezza 10

```
[Costante · Variabile: 6] valore ──▶ lati della base  [Prisma retto regolare] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ lato                                     area totale ──▶ valore [Print (console.log)]
[Costante · Variabile: 10] valore ──▶ altezza
```

Scrive queste righe, una per uscita:

```
103.923048454133
140.784609690827
```

### 2. Un prisma a base quadrata, lato 3, altezza 5

```
[Costante · Variabile: 4] valore ──▶ lati della base  [Prisma retto regolare] area di base ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ lato                                     volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 5] valore ──▶ altezza                                  apotema di base ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
9
45
1.5
```

Con 4 lati il prisma è un parallelepipedo a base quadrata.

## Errori

| Messaggio | Quando |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| Il numero di lati deve essere un intero da 3 a 1000 | I **lati della base** non sono un intero da 3 a 1000. |

## Vedi anche

- [Prisma retto (base qualsiasi)](solid.prismGeneric) se la base non è un poligono regolare
- [Piramide retta regolare](solid.pyramid) la piramide con la stessa base
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
