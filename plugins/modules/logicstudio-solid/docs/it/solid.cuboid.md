# Parallelepipedo rettangolo

`solid.cuboid` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un parallelepipedo rettangolo (una scatola): da lunghezza, larghezza e altezza calcola volume, aree e diagonale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lunghezza a** (`a`) | numero | La lunghezza. |
| **larghezza b** (`b`) | numero | La larghezza. |
| **altezza c** (`c`) | numero | L'altezza. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **area di base** (`base`) | numero | L'area di base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **diagonale** (`diagonal`) | numero | La diagonale dello spazio (tra due vertici opposti). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con le misure *a*, *b*, *c*:

- volume V = a·b·c
- area totale A = 2(ab + bc + ca)
- area di base = a·b; area laterale = 2c(a + b)
- diagonale = √(a² + b² + c²)

## Esempi

### 1. Una scatola 3 × 4 × 12

```
[Costante · Variabile: 3] valore ──▶ lunghezza a  [Parallelepipedo rettangolo] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ larghezza b                               area totale ──▶ valore [Print (console.log)]
[Costante · Variabile: 12] valore ──▶ altezza c                                diagonale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
144
192
13
```

### 2. Un mattone 25 × 12 × 6,5

```
[Costante · Variabile: 25] valore ──▶ lunghezza a  [Parallelepipedo rettangolo] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 12] valore ──▶ larghezza b                               area laterale ──▶ valore [Print (console.log)]
[Costante · Variabile: 6.5] valore ──▶ altezza c
```

Scrive queste righe, una per uscita:

```
1950
481
```

In centimetri: il volume è in cm³, l'area laterale in cm².

## Errori

| Messaggio | Quando |
|---|---|
| lunghezza a: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| larghezza b: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza c: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Cubo](solid.cube) quando le tre misure sono uguali
- [Massa da volume e materiale](solid.mass) per la massa dal volume
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
