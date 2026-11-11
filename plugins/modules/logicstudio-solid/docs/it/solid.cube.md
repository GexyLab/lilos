# Cubo

`solid.cube` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un cubo: dal lato calcola volume, aree, diagonali e i raggi delle sfere inscritta e circoscritta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lato** (`side`) | numero | Il lato del cubo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **diagonale della faccia** (`faceDiagonal`) | numero | La diagonale di una faccia. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **diagonale** (`diagonal`) | numero | La diagonale del cubo (tra due vertici opposti). |
| **raggio della sfera inscritta** (`inradius`) | numero | Il raggio della sfera inscritta (tocca le facce). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **raggio della sfera circoscritta** (`circumradius`) | numero | Il raggio della sfera circoscritta (passa per i vertici). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con lato *s*:

- volume V = s³
- area totale A = 6s²; area laterale = 4s²
- diagonale di una faccia = s√2; diagonale del cubo = s√3
- raggio della sfera inscritta = s/2; della sfera circoscritta = s√3/2

## Esempi

### 1. Un cubo di lato 2

```
[Costante · Variabile: 2] valore ──▶ lato  [Cubo] volume ──▶ valore [Print (console.log)]
                                                  area totale ──▶ valore [Print (console.log)]
                                                  diagonale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
8
24
3.46410161513775
```

### 2. Le sfere inscritta e circoscritta di un cubo di lato 10

```
[Costante · Variabile: 10] valore ──▶ lato  [Cubo] raggio della sfera inscritta ──▶ valore [Print (console.log)]
                                                   raggio della sfera circoscritta ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
5
8.66025403784439
```

Queste due uscite sono nascoste di serie: mostrale con l'occhio nelle Proprietà.

## Errori

| Messaggio | Quando |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Parallelepipedo rettangolo](solid.cuboid) se le tre misure sono diverse
- [Dalla misura alla dimensione](solid.fromMeasure) per trovare il lato dal volume o dall'area
- [Poliedri regolari](solid.polyhedron) tutti i poliedri regolari (il cubo è uno)
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
