# Tronco di cono

`solid.frustum` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Il tronco di un cono (tagliato parallelamente alla base): da raggi e altezza calcola volume, aree e apotema.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio maggiore** (`R`) | numero | Il raggio della base maggiore. |
| **raggio minore** (`r`) | numero | Il raggio della base minore (non più grande del raggio maggiore). |
| **altezza** (`h`) | numero | L'altezza (la distanza tra le due basi). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **apotema** (`slant`) | numero | L'apotema: l'altezza di una faccia laterale (nei coni, la generatrice). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con raggio maggiore *R*, minore *r* e altezza *h*:

- volume V = π·h·(R² + R·r + r²) / 3
- apotema s = √(h² + (R − r)²)
- area laterale = π·(R + r)·s; area totale = area laterale + π·(R² + r²)

Con *r* = *R* il tronco diventa un cilindro.

## Esempi

### 1. Un secchio: raggi 12 e 9, altezza 20

```
[Costante · Variabile: 12] valore ──▶ raggio maggiore  [Tronco di cono] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 9] valore ──▶ raggio minore                      apotema ──▶ valore [Print (console.log)]
[Costante · Variabile: 20] valore ──▶ altezza                           area laterale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
6974.33569096934
20.2237484161567
1334.23036849717
```

### 2. Con raggi uguali è un cilindro

```
[Costante · Variabile: 2] valore ──▶ raggio maggiore  [Tronco di cono] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ raggio minore                     area totale ──▶ valore [Print (console.log)]
[Costante · Variabile: 5] valore ──▶ altezza
```

Scrive queste righe, una per uscita:

```
62.8318530717959
87.9645943005142
```

Gli stessi numeri del [Cilindro](solid.cylinder) con r = 2 e h = 5.

## Errori

| Messaggio | Quando |
|---|---|
| raggio maggiore: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| raggio minore: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| Il raggio minore non può superare il raggio maggiore | Il raggio minore è più grande del raggio maggiore. |

## Vedi anche

- [Cono](solid.cone) il cono intero
- [Tronco di piramide regolare](solid.frustumPyramid) il tronco di piramide
- [Cilindro](solid.cylinder) quando i due raggi sono uguali
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
