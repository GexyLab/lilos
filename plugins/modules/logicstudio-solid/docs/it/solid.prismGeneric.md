# Prisma retto (base qualsiasi)

`solid.prismGeneric` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un prisma retto con una base qualsiasi: dall'area e dal perimetro di base e dall'altezza calcola volume e aree.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **area di base** (`base`) | numero | L'area della base. |
| **perimetro di base** (`perimeter`) | numero | Il perimetro della base. |
| **altezza** (`h`) | numero | L'altezza del prisma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con area di base *B*, perimetro *P* e altezza *h*:

- volume V = B·h
- area laterale = P·h; area totale = P·h + 2B

Il blocco non controlla che area e perimetro siano compatibili (per una data area esiste un perimetro minimo): usa i valori che dai.

## Esempi

### 1. Una base a L: area 12, perimetro 16, altezza 5

```
[Costante · Variabile: 12] valore ──▶ area di base       [Prisma retto] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 16] valore ──▶ perimetro di base                 area laterale ──▶ valore [Print (console.log)]
[Costante · Variabile: 5] valore ──▶ altezza                            area totale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
60
80
104
```

### 2. Un cilindro visto come prisma (cerchio di raggio 1)

```
[Costante · Variabile: 3.141592653589793] valore ──▶ area di base       [Prisma retto] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 6.283185307179586] valore ──▶ perimetro di base                 area totale ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ altezza
```

Scrive queste righe, una per uscita:

```
6.28318530717959
18.8495559215388
```

Area di base π, perimetro 2π, altezza 2: gli stessi numeri del [Cilindro](solid.cylinder) con r = 1 e h = 2.

## Errori

| Messaggio | Quando |
|---|---|
| area di base: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| perimetro di base: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Prisma retto regolare](solid.prism) per la base regolare
- [Cilindro](solid.cylinder) la base è un cerchio
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
