# Ellissoide

`solid.ellipsoid` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un ellissoide (una sfera schiacciata): dai tre semiassi calcola volume e superficie (approssimata).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **semiasse a** (`a`) | numero | Il primo semiasse. |
| **semiasse b** (`b`) | numero | Il secondo semiasse. |
| **semiasse c** (`c`) | numero | Il terzo semiasse. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **superficie (≈, errore < 1,1%)** (`area`) | numero | La superficie, approssimata (errore sotto l'1,1%). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con semiassi *a*, *b*, *c*:

- volume V = 4/3·π·a·b·c (esatto)
- superficie ≈ 4π·(((ab)ᵖ + (ac)ᵖ + (bc)ᵖ) / 3)^(1/p) con p = 1,6075 (formula di Knud Thomsen)

La superficie dell'ellissoide non ha una formula semplice: quella di Thomsen sbaglia al massimo dell'1,1%. Per una sfera (a = b = c) è esatta.

## Esempi

### 1. Un pallone da rugby: semiassi 15, 8, 8

```
[Costante · Variabile: 15] valore ──▶ semiasse a  [Ellissoide] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 8] valore ──▶ semiasse b                superficie (≈, errore < 1,1%) ──▶ valore [Print (console.log)]
[Costante · Variabile: 8] valore ──▶ semiasse c
```

Scrive queste righe, una per uscita:

```
4021.23859659493
1300.24869953216
```

### 2. Con tre semiassi uguali è una sfera

```
[Costante · Variabile: 1] valore ──▶ semiasse a  [Ellissoide] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ semiasse b               superficie (≈, errore < 1,1%) ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ semiasse c
```

Scrive queste righe, una per uscita:

```
4.18879020478639
12.5663706143592
```

Gli stessi numeri della [Sfera](solid.sphere) di raggio 1.

## Errori

| Messaggio | Quando |
|---|---|
| semiasse a: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| semiasse b: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| semiasse c: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Sfera](solid.sphere) quando i semiassi sono uguali
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
