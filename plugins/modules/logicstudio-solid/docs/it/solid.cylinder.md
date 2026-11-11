# Cilindro

`solid.cylinder` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un cilindro retto: da raggio e altezza calcola volume e aree.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio** (`r`) | numero | Il raggio della base. |
| **altezza** (`h`) | numero | L'altezza. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **area di base** (`base`) | numero | L'area di base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con raggio *r* e altezza *h*:

- volume V = π·r²·h
- area di base = π·r²
- area laterale = 2π·r·h; area totale = 2π·r·(r + h)

## Esempi

### 1. Un barattolo: raggio 4, altezza 10

```
[Costante · Variabile: 4] valore ──▶ raggio    [Cilindro] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 10] valore ──▶ altezza             area totale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
502.654824574367
351.858377202057
```

### 2. Un tubo: raggio 0,5, altezza 3

```
[Costante · Variabile: 0.5] valore ──▶ raggio  [Cilindro] area laterale ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ altezza              area di base ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
9.42477796076938
0.785398163397448
```

L'area di base è nascosta di serie.

## Errori

| Messaggio | Quando |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Dalla misura alla dimensione](solid.fromMeasure) per trovare raggio o altezza dal volume
- [Cono](solid.cone) il cono con la stessa base
- [Massa da volume e materiale](solid.mass) per la massa dal volume
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
